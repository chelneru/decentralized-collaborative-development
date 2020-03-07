const SDK = require('dat-sdk');
const SDKPromise = require('dat-sdk/promise');
const {DatArchive} = require('dat-sdk/auto');
var multidrive = require('hyperdrive-multiwriter');
const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = SDK();
const helpers = require('../misc/helpers');
var app = require('../../app');

class DatSystem {

    async Init(test) {
        let self = this;
        self.ready = false;

        this.archive = Hyperdrive(null, {
            title:'Local archive',
            persist: true,

            storage: null  //storage: RAI
        });
        self.archive.ready(() => {
            self.url = this.url;
            self.ready = true;
        });

        return this;
    }

    async GetRepoInfo() {
        // return await this.node.repo.stat();
    }

    async AddFile(path, file) {
        await this.archive.writeFile(path, file, () => {
            console.log('Written example file!')
        });
    }

    async GetFileInfo(path) {
        return await this.archive.readFile(path, 'utf8');
    }

    async PublishMainFolder() {

    }

    async GetAllFiles(recursive) {
        return await this.archive.readdir('/',recursive);
    }


    GetPeers() {
    }

    GetConnectedPeers() {
        return this.archive.peers;
    }

}

module.exports = DatSystem;