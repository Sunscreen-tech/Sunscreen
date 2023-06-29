use std::vec;

// use actix_web::{web, App, HttpServer};
use backtrace::{Backtrace, BacktraceFrame};
use radix_trie::Trie;

mod groups;

use groups::StackFrames;

/*
// Setup to build front-end with `cargo run`
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

#[get("/random")]
async fn rand_function(functions: web::Data<Vec<String>>) -> impl Responder {
    // Grab a function at random
    let mut rng = rand::thread_rng();
    let ind = rng.gen_range(0..functions.len());
    let rand_function = String::from(&functions[ind]);

    HttpResponse::Ok().body(rand_function)
}
*/

/*
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=debug");

    //List of random function bodies
    let lst = web::Data::new(vec!["test1".to_string(), "test2".to_string()]);

    env_logger::init();

    HttpServer::new(move || {
        App::new().app_data(lst.clone())
        /*
        .service(index)
        .service(main_js)
        .service(main_css)
        .service(manifest_json)
        .service(rand_function)
        */
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
*/

fn main() {
    /*
    let trace1 = Backtrace::new().frames().last().unwrap().clone();
    let trace2 = Backtrace::new().frames().last().unwrap().clone();

    let trace1_key: Vec<u64> = vec![1, 2, 3];
    let trace2_key: Vec<u64> = vec![1, 2, 3, 4, 5]; //try experimenting with this to turn it into 1, 2, 3, 4 or whatnot
    let mut trie: Trie<Vec<u64>, BacktraceFrame> = Trie::new();

    trie.insert(trace1_key, trace1);
    println!("{:?}", trie);

    println!("bruh");
    trie.insert(trace2_key, trace2);
    println!("{:?}", trie);
    */

    let mut trie2: Trie<Vec<u64>, BacktraceFrame> = Trie::new();
    let trace3 = Backtrace::new();

    // keys should be vectors of instruction pointers
    // values should be the frame information like filename, functionname, line number, etc
    // maybe store this in a new struct
    let key: Vec<u64> = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    trie2.add_stack_trace(key, trace3);

    println!("{:?}", trie2);
}
