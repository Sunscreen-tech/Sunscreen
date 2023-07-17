use actix_web::{get, web, App, HttpResponse, HttpServer, Responder, Handler};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::{to_string, to_string_pretty};
use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard, OnceLock};

use crate::{DebugInfo, FheRuntime, PrivateKey, SealData};

use sunscreen_compiler_common::CompilationResult;
use sunscreen_fhe_program::Operation;

use seal_fhe::SecretKey;
use sunscreen_zkp_backend::CompiledZkpProgram;


/**
 * Lazily starts a webserver at `127.0.0.1:8080/`.
 */
pub async fn start_web_server() -> std::io::Result<()> {
    let url = "http://127.0.0.1:8080/";
    println!("{:?}", "start_web_server".to_owned());
    match reqwest::get(url).await {
        Ok(_response) => Ok(()),
        Err(_e) => {
            HttpServer::new(|| {
                App::new()
                    .service(get_graph_data) // Here's where you add your function as a service
            })
                .bind(("127.0.0.1", 8080))?
                .run()
                .await
        }
    }
}

/**
 * Gets the graph data of a function.
 */
#[get("/{session}")]
async fn get_graph_data(session: web::Path<String>) -> impl Responder {
    let sessions = get_sessions().lock().unwrap();
    println!("get_graph_data session keys: {:?}", sessions.keys());

    if sessions.contains_key(session.as_str()) {
        let curr_session = sessions.get(session.as_str()).unwrap().unwrap_bfv_session();
        let graph_string = serde_json::to_string_pretty(&curr_session.graph.graph);
        HttpResponse::Ok().body(graph_string.unwrap().to_owned())
    } else {
        HttpResponse::NotFound().body("Session not found.".to_owned())
    }
}

/*
/**
 * Gets node data in the compilation graph.
 */
#[get("/nodes")]
async fn get_node_data(session: String, runtime: FheRuntime, priv_key: &PrivateKey) -> impl Responder {
    HttpResponse::Ok().body("hello".to_owned())
}
*/