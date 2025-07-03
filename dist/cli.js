#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const downloadGame_1 = require("./itchDownloader/downloadGame");
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .option('url', {
    describe: 'The full URL to the game on itch.io',
    type: 'string'
})
    .option('name', {
    describe: 'The name of the game to download',
    type: 'string'
})
    .option('author', {
    describe: 'The author of the game',
    type: 'string'
})
    .option('downloadDir', {
    describe: 'The filepath where the game will be downloaded',
    type: 'string'
})
    .check((argv) => {
    // Ensure either URL is provided or both name and author are provided
    if (argv.url) {
        return true;
    }
    else if (argv.name && argv.author) {
        return true;
    }
    else {
        throw new Error('Please provide either a URL or both name and author.');
    }
})
    .help()
    .alias('help', 'h')
    .parseSync();
const params = {
    itchGameUrl: argv.url,
    name: argv.name,
    author: argv.author,
    downloadDirectory: argv.downloadDir
};
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield (0, downloadGame_1.downloadGame)(params);
            console.log('Game Download Result:', result);
        }
        catch (error) {
            console.error('Error downloading game:', error);
        }
    });
}
run();
