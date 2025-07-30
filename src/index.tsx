import { config } from 'dotenv';
import Main from './components/main';
import { render } from 'ink';

config();

const { unmount } = render(<Main />);

process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  unmount();
});
