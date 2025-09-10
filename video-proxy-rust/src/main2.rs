use std::{env, io::Error, sync::Arc};

use futures_util::{lock::Mutex, SinkExt, StreamExt};
use mongodb::{bson::doc, Client};
use serde::{Deserialize, Serialize};
use tokio::net::{TcpListener, TcpStream};
use tokio_rustls::{
  rustls::{
    pki_types::{CertificateDer, PrivatePkcs8KeyDer},
    RootCertStore, ServerConfig,
  },
  TlsAcceptor,
};
use tokio_tungstenite::{
  accept_hdr_async, connect_async,
  tungstenite::{
    connect,
    handshake::server::{Request, Response},
    Message,
  },
};

#[derive(Debug, Serialize, Deserialize)]
struct Item {
  sessionId: String,
  streamHost2: String,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
  let uri = "mongodb://mindu:1234!@3.115.218.82:19123";
  let client = Client::with_uri_str(uri).await;

  if client.is_err() {
    println!("Failed to connect to MongoDB: {:?}", client.err());
    return Ok(());
  }

  let client = client.unwrap();

  let database = client.database("apiDB");
  let collection =
    Arc::new(Mutex::new(database.collection::<Item>("fake_login_data")));

  let addr = env::args()
    .nth(1)
    .unwrap_or_else(|| "127.0.0.1:8080".to_string());

  // Create the event loop and TCP listener we'll accept connections on.
  let try_socket = TcpListener::bind(&addr).await;
  let listener = try_socket.expect("Failed to bind");
  println!("Listening on: {}", addr);

  while let Ok((stream, _)) = listener.accept().await {
    let collection = Arc::clone(&collection);
    tokio::spawn(accept_connection(stream, collection));
  }

  Ok(())
}

async fn accept_connection(
  stream: TcpStream,
  collection: Arc<Mutex<mongodb::Collection<Item>>>,
) {
  let addr = stream
    .peer_addr()
    .expect("connected streams should have a peer address");
  println!("Peer address: {}", addr);

  let mut path = String::new();
  let mut query_string = String::new();

  let ws_callback = |req: &Request, response: Response| {
    path = req.uri().path().to_string();
    query_string = req.uri().query().unwrap_or("").to_string();

    Ok(response)
  };

  let client_stream = match accept_hdr_async(stream, ws_callback).await {
    Ok(stream) => stream,
    Err(e) => {
      println!("Error during the websocket handshake: {:?}", e);
      return;
    }
  };

  println!("Path and query: {}, {}", path, query_string);

  let video_session_id =
    match extract_query_param(&query_string, "videoSessionId") {
      Some(video_session_id) => video_session_id,
      None => {
        println!("No videoSessionId query parameter found");
        return;
      }
    };
  println!("videoSessionId: {:?}", video_session_id);

  let session_id = match video_session_id.split('-').nth(1) {
    Some(part) => part.to_string(),
    None => {
      println!("videoSessionId does not contain '-' or has no second part");
      return;
    }
  };
  println!("session_id: {:?}", session_id);

  println!("New WebSocket connection: {}", addr);

  let filter = doc! { "sessionId": session_id };
  let login_data = match collection.lock().await.find_one(filter).await {
    Ok(Some(data)) => data,
    Ok(None) => {
      println!("No matching document found");
      return;
    }
    Err(e) => {
      println!("MongoDB find error: {:?}", e);
      return;
    }
  };

  println!("Found item: {:?}", login_data);

  let url =
    format!("wss://{}{}?{}", login_data.streamHost2, path, query_string);

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
