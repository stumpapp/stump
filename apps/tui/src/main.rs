use crossterm::{
	event::{DisableMouseCapture, EnableMouseCapture},
	execute,
	terminal::{
		disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
	},
};
use error::TuiError;
use event::{sse::SSEHandler, CliEvent, TuiEvent};
use std::{
	io::{self, Stdout},
	sync::Arc,
	thread,
	time::Duration,
};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tui::{
	backend::CrosstermBackend,
	widgets::{Block, Borders},
	Terminal,
};

pub(crate) mod api;
pub(crate) mod cli;
pub(crate) mod error;
pub(crate) mod event;

struct StumpTui {
	base_url: String,
	sse_handler: Arc<SSEHandler>,
	internal_sender: UnboundedSender<TuiEvent>,
	internal_receiver: UnboundedReceiver<TuiEvent>,
	term: Terminal<CrosstermBackend<Stdout>>,
}

impl StumpTui {
	pub fn new(base_url: &str, term: Terminal<CrosstermBackend<Stdout>>) -> Self {
		let internal_channel = unbounded_channel::<TuiEvent>();

		let sender_cpy = internal_channel.0.clone();
		thread::spawn(move || {
			thread::sleep(Duration::from_secs(5));
			let _ = sender_cpy.send(TuiEvent::GracefulShutdown(None));
		});

		Self {
			base_url: base_url.to_string(),
			sse_handler: SSEHandler::new(base_url, internal_channel.0.clone()),
			internal_sender: internal_channel.0,
			internal_receiver: internal_channel.1,
			term,
		}
	}

	fn render(&mut self) -> Result<(), TuiError> {
		self.term.draw(|f| {
			let size = f.size();
			let block = Block::default().title("Stump").borders(Borders::ALL);
			f.render_widget(block, size);
		})?;

		Ok(())
	}

	pub fn shutdown(&mut self) -> Result<(), TuiError> {
		let _ = self.internal_sender.send(TuiEvent::GracefulShutdown(None));

		Ok(())
	}

	pub async fn run(&mut self) -> Result<(), TuiError> {
		self.term.clear()?;

		self.render()?;

		while let Some(event) = self.internal_receiver.recv().await {
			match event {
				TuiEvent::GracefulShutdown(message) => {
					if let Some(message) = message {
						println!("Graceful shutdown: {}", message);
					}
					break;
				},
				_ => {
					self.render()?;

					let err = tokio::spawn(async move {
						thread::sleep(Duration::from_secs(5));
						return TuiError::Unknown("test".to_string());
					})
					.await
					.unwrap();

					return Err(err);
				},
			}
		}

		disable_raw_mode()?;
		execute!(io::stdout(), LeaveAlternateScreen, DisableMouseCapture)?;
		Ok(())
	}
}

#[tokio::main]
async fn main() -> Result<(), TuiError> {
	match cli::parse_and_run().await? {
		CliEvent::GracefulShutdown(message) => {
			if let Some(message) = message {
				println!("{}", message);
			}

			return Ok(());
		},
		_ => {},
	};
	enable_raw_mode()?;
	let mut stdout = io::stdout();
	execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
	let backend = CrosstermBackend::new(stdout);
	let terminal = Terminal::new(backend)?;

	let mut stump_tui = StumpTui::new("http://localhost:10801", terminal);

	let res = stump_tui.run().await;

	stump_tui.shutdown()?;

	return res;
}
