import 'dotenv/config';
import app from './app';
import config from './src/config';
import { connectDB } from './src/lib/db';

const port = Number(config.port) || 50001;

async function main() {
  try {
    await connectDB();
    console.log('Database connected successfully');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.log('Database connection failed', error);
    process.exit(1);
  }
}

main();
