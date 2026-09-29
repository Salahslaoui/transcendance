import fastify from "fastify";
import fs from "fs";
import path from "path";

const filePath = path.join(__dirname, "MyContract.json");

const raw = fs.readFileSync(filePath, "utf8");
const artifact = JSON.parse(raw);

// const web3 = new Web3("http://localhost:8545");
