use actix_cors::Cors;
use actix_web::{get, http::header, web, App, HttpResponse, HttpServer, Responder};
use rand::Rng;
use serde::{Deserialize, Serialize};

const INDEX_HTML: &str = include_str!(concat!(
    env!("OUT_DIR"),
    "/fhe-debugger-frontend/build/index.html"
));

const MAIN_JS: &str = include_str!(concat!(
    env!("OUT_DIR"),
    "/fhe-debugger-frontend/build/static/js/main.76a9174c.js"
));

const MAIN_CSS: &str = include_str!(concat!(
    env!("OUT_DIR"),
    "/fhe-debugger-frontend/build/static/css/main.9aa52071.css"
));

const MANIFEST_JSON: &str = include_str!(concat!(
    env!("OUT_DIR"),
    "/fhe-debugger-frontend/build/manifest.json"
));

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok()
        .append_header(header::ContentType(mime::TEXT_HTML))
        .body(INDEX_HTML)
}

#[get("/static/js/main.76a9174c.js")]
async fn main_js() -> impl Responder {
    HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JAVASCRIPT))
        .body(MAIN_JS)
}

#[get("/static/css/main.9aa52071.css")]
async fn main_css() -> impl Responder {
    HttpResponse::Ok()
        .append_header(header::ContentType(mime::TEXT_CSS))
        .body(MAIN_CSS)
}

#[get("/manifest.json")]
async fn manifest_json() -> impl Responder {
    HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .body(MANIFEST_JSON)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=debug");

    HttpServer::new(move || {
        App::new()
            .service(index)
            .service(main_js)
            .service(main_css)
            .service(manifest_json)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
