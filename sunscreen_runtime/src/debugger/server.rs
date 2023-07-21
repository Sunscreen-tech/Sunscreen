use actix_web::{get, web, App, HttpResponse, HttpServer, Responder, http::header};

use petgraph::Direction::Incoming;
use seal_fhe::{Decryptor, Context, EncryptionParameters, BfvEncryptionParametersBuilder, Modulus, CoefficientModulus};
use semver::Version;
use serde::Deserialize;
use serde_json::{json, Value};
use petgraph::stable_graph::NodeIndex;
use sunscreen_compiler_common::{lookup};

use std::sync::OnceLock;
use std::thread;

use crate::{
    debugger::{get_sessions, get_mult_depth}, debugger::SerializedSealData, Ciphertext, InnerCiphertext,
    InnerPlaintext, Plaintext, Runtime, SealData, Type, WithContext,
};

use tokio::runtime::Builder;

static SERVER: OnceLock<()> = OnceLock::new();

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
                            .service(get_fhe_node_data)
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

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok()
        .insert_header(header::ContentType(mime::TEXT_HTML))
        .body(include_str!("../../debugger-frontend/index.html"))
}

#[get("/main.js")]
async fn main_js() -> impl Responder {
    HttpResponse::Ok()
        .insert_header(header::ContentType(mime::APPLICATION_JAVASCRIPT))
        .body(include_str!("../../debugger-frontend/build/main.js"))
}

#[get("/App.css")]
async fn app_css() -> impl Responder {
    HttpResponse::Ok()
        .insert_header(header::ContentType(mime::TEXT_CSS))
        .body(include_str!("../../debugger-frontend/src/App.css"))
}

#[get("/sessions")]
async fn get_all_sessions() -> impl Responder {
    let lock = get_sessions().lock().unwrap();
    let sessions = lock.keys().collect::<Vec<_>>();

    HttpResponse::Ok().body(serde_json::to_string(&sessions).unwrap())
}

/**
 * Gets the graph data of a function.
 */
#[get("/sessions/{session}")]
async fn get_session_data(session: web::Path<String>) -> impl Responder {
    let sessions = get_sessions().lock().unwrap();

    if sessions.contains_key(session.as_str()) {
        let curr_session = sessions.get(session.as_str()).unwrap().unwrap_bfv_session();
        let graph_string = serde_json::to_string_pretty(&curr_session.graph.graph);

        //let frontend_graph = process_graph_json(&graph_string.unwrap());
        //HttpResponse::Ok().body(frontend_graph.unwrap().to_owned())

        HttpResponse::Ok().body(graph_string.unwrap().to_owned())
    } else {
        HttpResponse::NotFound().body("Session not found.".to_owned())
    }
}

/**
 * Gets the Rust code of a function.
 */
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
 * Gets the info of a node in the debugging graph for an FHE program.
 */

// TODO: be able to extract type information to have non-garbage `value` and `data_type` fields
#[get("sessions/{session}/{nodeid}")]
pub async fn get_fhe_node_data(
    path_info: web::Path<(String, usize)>,
) -> Result<HttpResponse, actix_web::Error> {
    let (session, nodeid) = path_info.into_inner();
    let sessions = get_sessions().lock().unwrap();

    if sessions.contains_key(&session) {
        let curr_session = sessions.get(&session).unwrap().unwrap_bfv_session();

        if let Some(data) = curr_session.program_data.get(nodeid).unwrap() {
            let pk = &curr_session.private_key;
            let runtime = Runtime::new_fhe(&pk.0.params).unwrap();
            let stable_graph = &curr_session.graph.graph;

            let data_for_server: SerializedSealData = match data {
                SealData::Ciphertext(ct) => {
                    let with_context = WithContext {
                        params: pk.0.params.clone(),
                        data: ct.clone(),
                    };

                    let sunscreen_ciphertext = Ciphertext {
                        // WARNING: this is garbage data, so we can't return a Ciphertext value that makes sense
                        data_type: Type {
                            is_encrypted: true,
                            name: "".to_owned(),
                            version: Version::new(1, 1, 1),
                        },

                        inner: InnerCiphertext::Seal(vec![with_context]),
                    };


                    let noise_budget = runtime
                        .measure_noise_budget(&sunscreen_ciphertext, pk)
                        .unwrap();

                    let multiplicative_depth: u64 = get_mult_depth(&stable_graph, nodeid as u32, 0);

                    let mut coefficients = Vec::new();

                    let inner_cipher = sunscreen_ciphertext.inner;
                    match inner_cipher {
                        InnerCiphertext::Seal(vec) => {
                            for inner_cipher in vec {
                                //let mut inner_coefficients= Vec::new();

                                //let test = inner_cipher.params.coeff_modulus;
                                //let t = inner_cipher.params.lattice_dimension;
                                // Decrypt inner ciphertext
                                /* 
                                let mut encryption_params_builder = BfvEncryptionParametersBuilder::new()
                                    .set_coefficient_modulus(CoefficientModulus::create(inner_cipher.params.lattice_dimension, inner_cipher.params.coeff_modulus))
                                    .set_plain_modulus_u64(inner_cipher.params.plain_modulus)
                                    .set_poly_modulus_degree(inner_cipher.params.lattice_dimension);
                                */
                                //let encryption_params = encryption_params_builder.build().unwrap();
                                //let decryptor = Decryptor::new(
                                //    encryption_params,
                                //    &pk.0.data
                                //);



                                //coefficients.push(inner_coefficients);
                            }
                        }
                    }


                    // detecting overflow: a value is negative if a number is greater than plaintextmodulus/2, positive else
                    // if two input operands have same sign and output is opposite sign, then overflow

                    // detecting noise budget exceeded: noise budget will be 0
                        // noise budget in bits: a number between 0 and number of bits in q is number of bits remaining
                        // advantage of this: number of bits is linear in mult depth, decreasing
                    SerializedSealData {
                        value: 0,
                        data_type: sunscreen_ciphertext.data_type,
                        noise_budget,
                        coefficients,
                        multiplicative_depth,
                    }
                }
                SealData::Plaintext(pt) => {
                    let with_context = WithContext {
                        params: pk.0.params.clone(),
                        data: pt.clone(),
                    };

                    let sunscreen_plaintext = Plaintext {
                        // TODO: actually be able to extract type information
                        // Currently, any values we display to users will (in general) be garbage
                        data_type: Type {
                            is_encrypted: true,
                            name: "".to_owned(),
                            version: Version::new(1, 1, 1),
                        },
                        inner: InnerPlaintext::Seal(vec![with_context]),
                    };

                    let noise_budget = 0;
                    let multiplicative_depth = 0;

                    let mut coefficients = Vec::new();
                    /* 
                    for index in 0..pt.len() {
                        coefficients.push(pt.get_coefficient(index));
                    }
                    */

                    SerializedSealData {
                        value: 0,
                        data_type: sunscreen_plaintext.data_type,
                        noise_budget,
                        coefficients,
                        multiplicative_depth,
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
            Ok(HttpResponse::NotFound().body(format!("Node {} not found", nodeid)))
        }
    } else {
        Ok(HttpResponse::NotFound().body(format!("Session {} not found", session)))
    }
}