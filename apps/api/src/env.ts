import * as dotenv from "dotenv";
import path from "node:path";

const isDist = __dirname.split(path.sep).includes("dist");
const repoRoot = path.resolve(__dirname, isDist ? "../../../.." : "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });
