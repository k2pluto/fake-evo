use std::fs::File;
use std::io::{self, BufReader};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use rustls_pemfile::{certs, rsa_private_keys};
use tokio::io::{copy, sink, split, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio_rustls::{rustls, TlsAcceptor};
use tokio_tungstenite::tungstenite::handshake::client::{Request, Response};
use tokio_tungstenite::{accept_async, accept_hdr_async};

fn load_certs(path: &str) -> io::Result<Vec<CertificateDer<'static>>> {
  certs(&mut BufReader::new(File::open(path)?)).collect()
}

fn load_keys(path: &str) -> io::Result<Option<PrivateKeyDer<'static>>> {
  //let res = rsa_private_keys(&mut BufReader::new(File::open(path)?)).next();
  let res = rustls_pemfile::private_key(&mut BufReader::new(File::open(path)?));

  res
}

#[tokio::main]
async fn main() -> io::Result<()> {
  let addr = "127.0.0.1:8080".to_string();

  let certs = load_certs("key/cert.pem")?;

  let key = load_keys("key/private.pem")?;

  let key = key.unwrap();

  let config = rustls::ServerConfig::builder()
    .with_no_client_auth()
    .with_single_cert(certs, key)
    .map_err(|err| io::Error::new(io::ErrorKind::InvalidInput, err))?;
  let acceptor = TlsAcceptor::from(Arc::new(config));

  let listener = TcpListener::bind(&addr).await?;

  loop {
    let (stream, peer_addr) = listener.accept().await?;
    let acceptor = acceptor.clone();

    let fut = async move {
      let tls_stream = acceptor.accept(stream).await?;

      let socket = match accept_async(tls_stream).await {
        Ok(stream) => stream,
        Err(e) => {
          println!("Error during the websocket handshake: {:?}", e);
          return Ok({});
        }
      };

      let (mut client_ws_sender, mut client_ws_receiver) = socket.split();

      tokio::spawn(async move {
        while let Some(Ok(msg)) = client_ws_receiver.next().await {
          if let Err(e) = client_ws_sender.send(msg).await {
            println!("Error sending message to video socket: {:?}", e);
            break;
          }
        }
      });

      Ok(()) as io::Result<()>
    };

    tokio::spawn(async move {
      if let Err(err) = fut.await {
        eprintln!("spawn {:?}", err);
      }
    });
  }
}
