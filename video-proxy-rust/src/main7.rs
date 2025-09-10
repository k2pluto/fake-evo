use std::{convert::Infallible, env, net::SocketAddr, sync::Arc};

use futures_util::{SinkExt, StreamExt};
use hyper::{
  body::Incoming,
  header::{
    HeaderValue, CONNECTION, SEC_WEBSOCKET_ACCEPT, SEC_WEBSOCKET_KEY,
    SEC_WEBSOCKET_VERSION, UPGRADE,
  },
  server::conn::http1,
  service::service_fn,
  Method, Request, Response, StatusCode,
};
use hyper_util::rt::TokioIo;
use mongodb::{bson::doc, Client};
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_tungstenite::{
  connect_async,
  tungstenite::{handshake::derive_accept_key, protocol::Role},
  WebSocketStream,
};

type Body = http_body_util::Full<hyper::body::Bytes>;

#[derive(Debug, Serialize, Deserialize)]
struct Item {
  sessionId: String,
  streamHost2: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  let uri = "mongodb://mindu:1234!@3.115.218.82:19123";
  let client = Client::with_uri_str(uri).await?;

  let database = client.database("apiDB");
  let collection =
    Arc::new(Mutex::new(database.collection::<Item>("fake_login_data")));

  let addr = env::args()
    .nth(1)
    .unwrap_or_else(|| "127.0.0.1:4000".to_string())
    .parse::<SocketAddr>()?;

  let listener = TcpListener::bind(addr).await?;

  loop {
    let (stream, remote_addr) = listener.accept().await?;
    let collection = collection.clone();

    tokio::spawn(async move {
      let io = TokioIo::new(stream);

      let service = service_fn(move |req| {
        handle_request(collection.clone(), req, remote_addr)
      });

      let conn = http1::Builder::new()
        .serve_connection(io, service)
        .with_upgrades();

      if let Err(err) = conn.await {
        eprintln!("failed to serve connection: {err:?}");
      }
    });
  }
}

async fn handle_request(
  collection: Arc<Mutex<mongodb::Collection<Item>>>,
  mut req: Request<Incoming>,
  addr: SocketAddr,
) -> Result<Response<Body>, Infallible> {
  if req.method() == Method::GET && (req.uri().path() == "/health") {
    return Ok(Response::new(Body::from("OK")));
  }

  let upgrade = HeaderValue::from_static("Upgrade");
  let websocket = HeaderValue::from_static("websocket");
  let headers = req.headers();
  let key = headers.get(SEC_WEBSOCKET_KEY);
  let derived = key.map(|k| derive_accept_key(k.as_bytes()));

  if req.method() != Method::GET
    || !headers
      .get(UPGRADE)
      .map(|h| h == websocket)
      .unwrap_or(false)
    || !headers
      .get(CONNECTION)
      .map(|h| h.to_str().unwrap_or("").to_lowercase().contains("upgrade"))
      .unwrap_or(false)
    || !headers
      .get(SEC_WEBSOCKET_VERSION)
      .map(|h| h == "13")
      .unwrap_or(false)
  {
    let mut response = Response::new(Body::from("Invalid Upgrade Request"));
    *response.status_mut() = StatusCode::BAD_REQUEST;
    return Ok(response);
  }

  let ver = req.version();

  let client_stream = match hyper::upgrade::on(&mut req).await {
    Ok(upgraded) => {
      let upgraded = TokioIo::new(upgraded);
      WebSocketStream::from_raw_socket(upgraded, Role::Server, None).await
    }
    Err(_) => {
      let mut response = Response::new(Body::from("Upgrade Failed"));
      *response.status_mut() = StatusCode::BAD_REQUEST;
      return Ok(response);
    }
  };

  let query_string = req.uri().query().unwrap_or("").to_string();
  println!("Path and query: {}, {}", req.uri().path(), query_string);

  let video_session_id =
    match extract_query_param(&query_string, "videoSessionId") {
      Some(video_session_id) => video_session_id,
      None => {
        let mut response =
          Response::new(Body::from("No videoSessionId query parameter found"));
        *response.status_mut() = StatusCode::BAD_REQUEST;
        return Ok(response);
      }
    };
  println!("videoSessionId: {:?}", video_session_id);

  let session_id = match video_session_id.split('-').nth(1) {
    Some(part) => part.to_string(),
    None => {
      let mut response =
        Response::new(Body::from("Invalid videoSessionId format"));
      *response.status_mut() = StatusCode::BAD_REQUEST;
      return Ok(response);
    }
  };
  println!("session_id: {:?}", session_id);

  let filter = doc! { "sessionId": &session_id };
  let login_data = match collection.lock().await.find_one(filter).await {
    Ok(Some(data)) => data,
    Ok(None) => {
      let mut response =
        Response::new(Body::from("No matching document found"));
      *response.status_mut() = StatusCode::UNAUTHORIZED;
      return Ok(response);
    }
    Err(_) => {
      let mut response = Response::new(Body::from("MongoDB find error"));
      *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
      return Ok(response);
    }
  };

  println!("Found item: {:?}", login_data);

  let url = format!(
    "wss://{}{}?{}",
    login_data.streamHost2,
    req.uri().path(),
    query_string
  );

  println!("Connecting to video socket: {}", url);

  let (mut client_ws_sender, mut client_ws_receiver) = client_stream.split();

  let (video_socket, _) = connect_async(url)
    .await
    .expect("Failed to connect to videoWs");

  let (mut video_socket_sender, mut video_socket_receiver) =
    video_socket.split();

  tokio::spawn(async move {
    loop {
      tokio::select! {
          client_msg = client_ws_receiver.next() => {
              match client_msg {
                  Some(Ok(msg)) => {
                      if msg.is_text() || msg.is_binary() {
                          println!("Client message: {:?}", msg);
                          if let Err(e) = video_socket_sender.send(msg).await {
                              println!("Error sending message to video socket: {:?}", e);
                              break;
                          }
                      }
                  },
                  Some(Err(e)) => {
                      println!("Client socket error: {:?}", e);
                      println!("Client socket closed");
                      break;
                  },
                  None => {
                      println!("Client socket closed");
                      break;
                  },
              }
          },
          video_msg = video_socket_receiver.next() => {
              match video_msg {
                  Some(Ok(msg)) => {
                      if msg.is_text() || msg.is_binary() {
                          println!("Server message: {:?}", msg);
                          if let Err(e) = client_ws_sender.send(msg).await {
                              println!("Error sending message to client socket: {:?}", e);
                              break;
                          }
                      }
                  },
                  Some(Err(e)) => {
                      println!("Video socket error: {:?}", e);
                      println!("Video socket closed");
                      break;
                  },
                  None => {
                      println!("Video socket closed");
                      break;
                  },
              }
          },
          else => break,
      }
    }
    println!("Socket closed");
    // Close both connections if either one breaks
    if let Err(e) = client_ws_sender.close().await {
      println!("Error closing client websocket: {:?}", e);
    }
    if let Err(e) = video_socket_sender.close().await {
      println!("Error closing video websocket: {:?}", e);
    }
  });
  let mut response = Response::new(Body::default());
  *response.status_mut() = StatusCode::SWITCHING_PROTOCOLS;
  *response.version_mut() = ver;
  response.headers_mut().append(CONNECTION, upgrade);
  response.headers_mut().append(UPGRADE, websocket);
  if let Some(derived) = derived {
    response
      .headers_mut()
      .append(SEC_WEBSOCKET_ACCEPT, derived.parse().unwrap());
  }

  Ok(response)
}

fn extract_query_param(query: &str, key: &str) -> Option<String> {
  println!("Query: {:?}", query);
  query.split('&').find_map(|pair| {
    let mut split = pair.splitn(2, '=');
    let param_key = split.next()?;
    let param_value = split.next()?;
    if param_key == key {
      Some(param_value.to_string())
    } else {
      None
    }
  })
}
