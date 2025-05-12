import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs'; 

const projectRootEnvPath = path.resolve(process.cwd(), '../../.env');

console.log(`[E2E Setup] Current working directory: ${process.cwd()}`);
console.log(`[E2E Setup] Attempting to load .env file from: ${projectRootEnvPath}`);

if (fs.existsSync(projectRootEnvPath)) {
  const result = dotenv.config({ path: projectRootEnvPath, override: true });

  if (result.error) {
    console.error(`[E2E Setup] Error loading .env file from ${projectRootEnvPath}: ${result.error.message}`, result.error.stack);
  } else {
    if (result.parsed) {
      console.log(`[E2E Setup] .env file loaded successfully from ${projectRootEnvPath}.`);
      if (!process.env.PAYMENT_GATEWAY_URL) {
          console.warn('[E2E Setup] Warning: PAYMENT_GATEWAY_URL is still not defined in process.env after loading .env!');
      }
    } else {
      console.warn(`[E2E Setup] .env file found at ${projectRootEnvPath}, but no variables were parsed. The file might be empty or malformed.`);
    }
  }
} else {
  console.warn(`[E2E Setup] Warning: .env file not found at ${projectRootEnvPath}. Proceeding without it.`);
}

