use actix_web::{get, App, HttpResponse, HttpServer, Responder};

use sunscreen::{
    fhe_program,
    types::{bfv::Rational, bfv::Signed, Cipher},
    Compiler, Error,
};

#[get("/rationaladd")]
async fn rational_add_handler() -> impl Responder {
    match process_rational_add().await {
        Ok(result) => HttpResponse::Ok().body(result),
        Err(err) => {
            eprintln!("Error: {:?}", err);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/rationalmul")]
async fn rational_mul_handler() -> impl Responder {
    match process_rational_mul().await {
        Ok(result) => HttpResponse::Ok().body(result),
        Err(err) => {
            eprintln!("Error: {:?}", err);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/rationalcomplex")]
async fn rational_complex_handler() -> impl Responder {
    match process_rational_complex().await {
        Ok(result) => HttpResponse::Ok().body(result),
        Err(err) => {
            eprintln!("Error: {:?}", err);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/multiply")]
async fn multiply_handler() -> impl Responder {
    match process_multiply().await {
        Ok(result) => HttpResponse::Ok().body(result),
        Err(err) => {
            eprintln!("Error: {:?}", err);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/add")]
async fn add_handler() -> impl Responder {
    match process_add().await {
        Ok(result) => HttpResponse::Ok().body(result),
        Err(err) => {
            eprintln!("Error: {:?}", err);
            HttpResponse::InternalServerError().finish()
        }
    }
}

async fn process_add() -> Result<String, Error> {
    let app = Compiler::new().fhe_program(simple_add).compile()?;

    let comp_program = app.get_fhe_program(simple_add).unwrap().clone();
    let prog_context = comp_program.fhe_program_fn;

    let graph_string = serde_json::to_string_pretty(&prog_context).unwrap();

    Ok(graph_string)
}

async fn process_multiply() -> Result<String, Error> {
    let app = Compiler::new().fhe_program(simple_multiply).compile()?;

    let comp_program = app.get_fhe_program(simple_multiply).unwrap().clone();
    let prog_context = comp_program.fhe_program_fn;

    let graph_string = serde_json::to_string_pretty(&prog_context).unwrap();

    Ok(graph_string)
}

async fn process_rational_add() -> Result<String, Error> {
    let app = Compiler::new().fhe_program(rational_add).compile()?;

    let comp_program = app.get_fhe_program(rational_add).unwrap().clone();
    let prog_context = comp_program.fhe_program_fn;

    let graph_string = serde_json::to_string_pretty(&prog_context).unwrap();

    Ok(graph_string)
}

async fn process_rational_mul() -> Result<String, Error> {
    let app = Compiler::new().fhe_program(rational_multiply).compile()?;

    let comp_program = app.get_fhe_program(rational_multiply).unwrap().clone();
    let prog_context = comp_program.fhe_program_fn;

    let graph_string = serde_json::to_string_pretty(&prog_context).unwrap();

    Ok(graph_string)
}

async fn process_rational_complex() -> Result<String, Error> {
    let app = Compiler::new().fhe_program(complex_rational).compile()?;

    let comp_program = app.get_fhe_program(complex_rational).unwrap().clone();
    let prog_context = comp_program.fhe_program_fn;

    let graph_string = serde_json::to_string_pretty(&prog_context).unwrap();

    Ok(graph_string)
}

pub fn start_web_server() {

}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(multiply_handler)
            .service(add_handler)
            .service(rational_complex_handler)
            .service(rational_add_handler)
            .service(rational_mul_handler)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}