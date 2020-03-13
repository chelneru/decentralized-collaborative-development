"use strict";

import IpfsSystem from '../../app/p2p-system/ipfs-p2p-system.js';

const CID = require('cids');
describe('Test IPFS start daemon', () => {
    let node;
    let res;
    beforeAll(async () => {
        node = await IpfsSystem.create();
        res = await node.node.id();
    });
    afterAll(async () => {
        await node.node.stop();
    });
    test('should test that we can retrieve node id information', () => {
        expect(res).toHaveProperty('id');
        expect(typeof res.id).toBe('string');
        expect(CID.isCID(new CID(res.id))).toEqual(true);
        expect(res).toHaveProperty('publicKey');
        // expect(res).toHaveProperty('addresses').toBe('array').and.all.satisfy(ma => Multiaddr.isMultiaddr(ma))
        expect(res).toHaveProperty('agentVersion');
        expect(typeof res.agentVersion).toBe('string');
        expect(res).toHaveProperty('protocolVersion');
        expect(typeof res.protocolVersion).toBe('string');

    });
    test('get repo info', async () => {
        const repoInfo = await node.GetRepoInfo();
        expect(typeof repoInfo.repoPath).toBe('string');

    });
    test('add files to the node', async () => {
        const res = await node.AddFile('/hello-world', Buffer.from('Hello, world!'));
        expect(res).toHaveProperty('path');
        expect(res.path).toContain('hello-world');
        expect(res).toHaveProperty('cid');
        expect(CID.isCID(new CID(res.cid))).toEqual(true);
    });

    test('read files from the node', async () => {
        let path = '/hello-world.txt';
        let path_test = 'hello-world.txt';
        let add_res = await node.AddFile(path, Buffer.from('Hello, world!'));
        const res = await node.GetFileInfo(add_res.cid.toString());
        expect(res).toHaveProperty('type');
        expect(res).toHaveProperty('cid');
        expect(res.cid.toString()).toMatch(add_res.cid.toString());
        expect(CID.isCID(new CID(res.cid))).toEqual(true);
    });
    test('publish main folder', async () => {
        // await node.PublishMainFolder();
        expect(node.main_folder_addr).not.toBeNull();

        const res = await node.GetFileInfo(node.main_folder_addr);

        expect(res).toHaveProperty('type');

        expect(res).toHaveProperty('cid');

        expect(CID.isCID(new CID(res.cid))).toEqual(true);
    });

});
