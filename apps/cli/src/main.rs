use crossterm::{
	event::{DisableMouseCapture, EnableMouseCapture},
	execute,
	terminal::{
		disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
	},
};
use std::{io, thread, time::Duration};
use tui::{
	backend::CrosstermBackend,
	widgets::{Block, Borders},
	Terminal,
};

pub(crate) mod api;

#[tokio::main]
async fn main() -> Result<(), io::Error> {
	// setup terminal
	enable_raw_mode()?;
	let mut stdout = io::stdout();
	execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
	let backend = CrosstermBackend::new(stdout);
	let mut terminal = Terminal::new(backend)?;

	terminal.draw(|f| {
		let size = f.size();
		let block = Block::default().title("Stump").borders(Borders::ALL);
		f.render_widget(block, size);
	})?;

	thread::sleep(Duration::from_millis(5000));

	// restore terminal
	disable_raw_mode()?;
	execute!(
		terminal.backend_mut(),
		LeaveAlternateScreen,
		DisableMouseCapture
	)?;
	terminal.show_cursor()?;

	Ok(())
}
