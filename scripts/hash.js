const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const sha256 = require("sha256")

const filePathMainnet = path.join(__dirname, "../build/release/contract.wasm");
const dataMainnet = fs.readFileSync(filePathMainnet);
const arrByte = Uint8Array.from(dataMainnet);
const hash2 = sha256(arrByte, { asBytes: true });

console.log("Hash is: ", [18,32].concat(hash2).toString())