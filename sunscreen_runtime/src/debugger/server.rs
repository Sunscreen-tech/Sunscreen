use actix_web::{get, web, App, HttpResponse, HttpServer, Responder, Handler};
use rayon::iter::Once;
use reqwest;
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use serde_json::{to_string, to_string_pretty, Value, Error, json};
use std::collections::HashMap;
use std::ops::IndexMut;
use std::sync::{Mutex, MutexGuard, OnceLock};
use std::thread;


use crate::{DebugInfo, FheRuntime, PrivateKey, SealData};
use crate::debugger::get_sessions;
use sunscreen_compiler_common::CompilationResult;
use sunscreen_fhe_program::Operation;

use seal_fhe::SecretKey;
use sunscreen_zkp_backend::CompiledZkpProgram;

static SERVER: OnceLock<()> = OnceLock::new();

/**
 * Lazily starts a webserver at `127.0.0.1:8080/`.
 */
pub fn start_web_server() -> () {
    SERVER.get_or_init(|| {
        thread::Builder::new()
            .name("debugger".to_owned())
            .spawn(|| {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build().unwrap();

            rt.block_on(async {
                println!("start_web_server");
                
                HttpServer::new(move || {
                    let cors = Cors::default()
                    .allow_any_origin()
                    .allowed_methods(vec!["GET"]);
        
                    App::new()
                        .wrap(cors)
                        .service(get_graph_data) 
                        .service(get_all_sessions)
                        .service(get_code)
                })
                    .bind(("127.0.0.1", 8080))
                    .unwrap()
                    .run()
                    .await
                    .unwrap()
            });
        }).unwrap();
    });
}

#[get("/graphs")]
async fn get_all_sessions() -> impl Responder {
    let lock = get_sessions().lock().unwrap();
    let sessions = lock.keys().collect::<Vec<_>>();

    HttpResponse::Ok().body(serde_json::to_string(&sessions).unwrap())
}

/**
 * Gets the graph data of a function.
 */
#[get("/graphs/{session}")]
async fn get_graph_data(session: web::Path<String>) -> impl Responder {
    let sessions = get_sessions().lock().unwrap();
    println!("get_graph_data session keys: {:?}", sessions.keys());

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
    println!("get_code session keys: {:?}", sessions.keys());

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
/*
#[get("graphs/{session}/{nodeid}")]
pub async fn get_fhe_node_data(
    path_info: web::Path<(String, usize)>
    ) -> Result<HttpResponse, actix_web::Error> {
    
    let (session, nodeid) = path_info.into_inner();
    let sessions = get_sessions().lock().unwrap();

    if sessions.contains_key(&session) {
        let curr_session = sessions.get(&session).unwrap().unwrap_bfv_session();

        let data = curr_session
            .program_data
            .get(nodeid)
            .unwrap();

        let data_json = serde_json::to_string(data).map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!(
                "Failed to serialize node data to JSON: {}",
                e
            ))
        })?;
        Ok(HttpResponse::Ok().body(data_json))
    } else {
        Ok(HttpResponse::NotFound().body("Node {:?} not found", nodeid))
    }
} */


/*
/**
 * Gets node data in the compilation graph.
 */
#[get("/nodes")]
async fn get_node_data(session: String, runtime: FheRuntime, priv_key: &PrivateKey) -> impl Responder {
    HttpResponse::Ok().body("hello".to_owned())
}
*/

 
#[derive(Debug, Deserialize)]
struct GraphFormat {
    nodes: Vec<Value>,
    edges: Vec<Vec<Value>>,
}

fn process_graph_json(json_str: &str) -> Result<String, serde_json::Error> {
    let input_json: serde_json::Value = serde_json::from_str(json_str).unwrap();

    let mut new_nodes = Vec::new();
    let mut new_edges = Vec::new();

    if let Some(nodes) = input_json.get("nodes") {
        for (index, _) in nodes.as_array().unwrap().iter().enumerate() {
            new_nodes.push(json!({
                "type": "empty",
                "title": "blank",
                "id": index, 
            }));
        }
    }

    if let Some(edges) = input_json.get("edges") {
        for edge in edges.as_array().unwrap() {
            new_edges.push(json!({
                "arrowhead": "normal",
                "directed": true, 
                "target": edge[1].as_i64().unwrap(),
                "source": edge[0].as_i64().unwrap(),
            }));
        }
    }

    let output = json!({
        "nodes": new_nodes,
        "edges": new_edges
    });

    Ok(output.to_string())

}
