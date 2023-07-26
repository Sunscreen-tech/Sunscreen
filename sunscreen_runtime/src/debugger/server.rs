use actix_web::{get, http::header, web, App, HttpResponse, HttpServer, Responder};

use semver::Version;

use crate::{
    debugger::sessions::{BfvSession, Session, ZkpSession},
    debugger::{decrypt_seal, get_mult_depth, get_sessions, overflow_occurred},
    debugger::{BfvNodeType, DebugNodeType, ZkpNodeType},
    Ciphertext, InnerCiphertext, InnerPlaintext, Plaintext, Runtime, SealData, Type, WithContext,
};
use petgraph::stable_graph::NodeIndex;
use std::sync::OnceLock;
use std::thread;

use tokio::runtime::Builder;

static SERVER: OnceLock<()> = OnceLock::new();

#[cfg(feature = "debugger")]
/**
 * Lazily starts a webserver at `127.0.0.1:8080/`.
 */
pub fn start_web_server() {
    SERVER.get_or_init(|| {
        thread::Builder::new()
            .name("debugger".to_owned())
            .spawn(|| {
                let rt = Builder::new_current_thread().enable_all().build().unwrap();

                rt.block_on(async {
                    HttpServer::new(move || {
                        App::new()
                            .service(get_session_data)
                            .service(get_all_sessions)
                            .service(get_code)
                            .service(get_node_data)
                            .service(get_stack_trace)
                            .service(index)
                            .service(app_css)
                            .service(main_js)
                    })
                    .disable_signals()
                    .bind(("127.0.0.1", 8080))
                    .unwrap()
                    .run()
                    .await
                    .unwrap()
                });
            })
            .unwrap();
    });
}

#[cfg(feature = "debugger")]
#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok()
        .insert_header(header::ContentType(mime::TEXT_HTML))
        .body(include_str!("../../debugger-frontend/index.html"))
}
#[cfg(feature = "debugger")]
#[get("/main.js")]
async fn main_js() -> impl Responder {
    HttpResponse::Ok()
        .insert_header(header::ContentType(mime::APPLICATION_JAVASCRIPT))
        .body(include_str!("../../debugger-frontend/build/main.js"))
}

#[cfg(feature = "debugger")]
#[get("/App.css")]
async fn app_css() -> impl Responder {
    HttpResponse::Ok()
        .insert_header(header::ContentType(mime::TEXT_CSS))
        .body(include_str!("../../debugger-frontend/src/App.css"))
}

#[cfg(feature = "debugger")]
#[get("/sessions")]
async fn get_all_sessions() -> impl Responder {
    let lock = get_sessions().lock().unwrap();
    let sessions = lock.keys().collect::<Vec<_>>();

    HttpResponse::Ok().body(serde_json::to_string(&sessions).unwrap())
}

/**
 * Gets the graph data of a function.
 */
#[cfg(feature = "debugger")]
#[get("/sessions/{session}")]
async fn get_session_data(session: web::Path<String>) -> impl Responder {
    let sessions = get_sessions().lock().unwrap();

    if sessions.contains_key(session.as_str()) {
        let curr_session = sessions.get(session.as_str()).unwrap().unwrap_bfv_session();
        let graph_string = serde_json::to_string_pretty(&curr_session.graph.graph);

        HttpResponse::Ok().body(graph_string.unwrap().to_owned())
    } else {
        HttpResponse::NotFound().body("Session not found.".to_owned())
    }
}

/**
 * Gets the Rust code of a function.
 */
#[cfg(feature = "debugger")]
#[get("programs/{session}")]
async fn get_code(session: web::Path<String>) -> impl Responder {
    let sessions = get_sessions().lock().unwrap();

    if sessions.contains_key(session.as_str()) {
        let curr_session = sessions.get(session.as_str()).unwrap().unwrap_bfv_session();
        let code_string = &curr_session.source_code;

        HttpResponse::Ok().body(code_string.to_owned())
    } else {
        HttpResponse::NotFound().body("Session not found.".to_owned())
    }
}

/**
 * Gets the info of a node in the debugging graph for an FHE/ZKP program.
 */

// TODO: be able to extract type information to have non-garbage `value` and `data_type` fields
#[cfg(feature = "debugger")]
#[get("sessions/{session}/{nodeid}")]
pub async fn get_node_data(
    path_info: web::Path<(String, usize)>,
) -> Result<HttpResponse, actix_web::Error> {
    let (session, nodeid) = path_info.into_inner();
    let sessions = get_sessions().lock().unwrap();

    if sessions.contains_key(&session) {
        let curr_session = sessions.get(&session).unwrap();

        let data_for_server: DebugNodeType = match curr_session {
            Session::BfvSession(bfv_session) => {
                if let Some(data) = bfv_session
                    .program_data
                    .get(nodeid)
                    .unwrap_or_else(|| panic!("Index {} out of range", nodeid))
                {
                    let pk = &bfv_session.private_key;
                    let runtime = Runtime::new_fhe(&pk.0.params).unwrap();
                    let stable_graph = &bfv_session.graph.graph;

                    match data {
                        SealData::Ciphertext(ct) => {
                            let with_context = WithContext {
                                params: pk.0.params.clone(),
                                data: ct.clone(),
                            };

                            let sunscreen_ciphertext = Ciphertext {
                                // WARNING: this is garbage data, so we can't return a decrypted Ciphertext whose value makes sense
                                data_type: Type {
                                    is_encrypted: true,
                                    name: "ciphertext".to_owned(),
                                    version: Version::new(1, 1, 1),
                                },

                                inner: InnerCiphertext::Seal {
                                    value: vec![with_context],
                                },
                            };

                            let noise_budget = runtime
                                .measure_noise_budget(&sunscreen_ciphertext, pk)
                                .unwrap();

                            let multiplicative_depth: u64 =
                                get_mult_depth(stable_graph, NodeIndex::new(nodeid), 0);

                            let overflowed = overflow_occurred(
                                stable_graph,
                                NodeIndex::new(nodeid),
                                pk.0.params.plain_modulus,
                                &pk,
                                &bfv_session.program_data.clone(),
                            );

                            let coefficients = decrypt_seal(sunscreen_ciphertext.inner, &pk.0.data);

                            DebugNodeType::Bfv(BfvNodeType {
                                // WARNING: `value` and `data_type` are nonsense values
                                value: 0,
                                data_type: sunscreen_ciphertext.data_type,
                                noise_budget: Some(noise_budget),
                                coefficients,
                                multiplicative_depth,
                                overflowed: Some(overflowed),
                                noise_exceeded: Some(noise_budget == 0),
                            })
                        }
                        SealData::Plaintext(pt) => {
                            let with_context = WithContext {
                                params: pk.0.params.clone(),
                                data: pt.clone(),
                            };

                            let sunscreen_plaintext = Plaintext {
                                // WARNING: this is garbage data, so we can't return a Plaintext whose value makes sense
                                data_type: Type {
                                    is_encrypted: false,
                                    name: "plaintext".to_owned(),
                                    version: Version::new(1, 1, 1),
                                },
                                inner: InnerPlaintext::Seal {
                                    value: vec![with_context],
                                },
                            };

                            let multiplicative_depth = 0;

                            let mut coefficients: Vec<Vec<u64>> = Vec::new();
                            let mut inner_coefficients = Vec::new();
                            for i in 0..pt.len() {
                                inner_coefficients.push(pt.get_coefficient(i));
                            }
                            coefficients.push(inner_coefficients);

                            DebugNodeType::Bfv(BfvNodeType {
                                // WARNING: `value` and `data_type` contain nonsense
                                value: 0,
                                data_type: sunscreen_plaintext.data_type,
                                noise_budget: None,
                                coefficients,
                                multiplicative_depth,
                                overflowed: None,
                                noise_exceeded: None,
                            })
                        }
                    }
                } else {
                    return Ok(HttpResponse::NotFound().body(format!("Node {} not found", nodeid)));
                }
            }
            Session::ZkpSession(zkp_session) => {
                if let Some(data) = zkp_session.program_data.get(nodeid) {
                    DebugNodeType::Zkp(ZkpNodeType {
                        value: data.unwrap().to_string(),
                    })
                } else {
                    return Ok(HttpResponse::NotFound().body(format!("Node {} not found", nodeid)));
                }
            }
        };
        let data_json = serde_json::to_string(&data_for_server).map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!(
                "Failed to serialize node data to JSON: {}",
                e
            ))
        })?;
        Ok(HttpResponse::Ok().body(data_json))
    } else {
        Ok(HttpResponse::NotFound().body(format!("Session {} not found", session)))
    }
}

/**
 * Gets the stack trace associated with a node.
 */
#[cfg(feature = "debugger")]
#[get("sessions/{session}/stacktrace/{nodeid}")]
pub async fn get_stack_trace(
    path_info: web::Path<(String, usize)>,
) -> Result<HttpResponse, actix_web::Error> {
    let (session, nodeid) = path_info.into_inner();
    let sessions = get_sessions().lock().unwrap();

    if let Some(curr_session) = sessions.get(&session) {
        let curr_session = curr_session.unwrap_bfv_session();
        let stack_lookup = &curr_session.graph.metadata.stack_lookup;

        if let Some(node_info) = curr_session.graph.node_weight(NodeIndex::new(nodeid)) {
            if let Some(stack_frames) = stack_lookup.id_data_lookup.get(&node_info.stack_id) {
                let stack_frames_json = serde_json::to_string(&stack_frames).unwrap();
                return Ok(HttpResponse::Ok().body(stack_frames_json));
            } else {
                return Ok(HttpResponse::NotFound()
                    .body(format!("Stack trace for node {} not found", nodeid)));
            }
        }
    }
    Ok(HttpResponse::NotFound().body(format!("Session {} not found", session)))
}
