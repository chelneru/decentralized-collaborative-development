"use strict";

import IpfsSystem from '../../../app/p2p-system/ipfs-p2p-system.js';
import os from 'os';

describe('Test IPFS nodes interaction', () => {
    let node1;
    let node2;
    let options1 = {
        repo: os.homedir() + '/.jsipfs2',
        config: {
            Addresses: {
                Swarm: [
                    '/ip4/0.0.0.0/tcp/4012',
                    '/ip4/127.0.0.1/tcp/4013/ws'
                ],
                API: '/ip4/127.0.0.1/tcp/5012',
                Gateway: '/ip4/127.0.0.1/tcp/9191'
            }
        }
    }, options2 = {
        repo: os.homedir() + '/.jsipfs3',
        config: {
            Addresses: {
                Swarm: [
                    '/ip4/0.0.0.0/tcp/4013',
                    '/ip4/127.0.0.1/tcp/4014/ws'
                ],
                API: '/ip4/127.0.0.1/tcp/5013',
                Gateway: '/ip4/127.0.0.1/tcp/9192'
            }
        }

    };
    beforeAll(async () => {

        node1 = await IpfsSystem.create(options1,true);

        node2 = await IpfsSystem.create(options2,true);
        let res = await node2.AddBootstrapPeer(node1.addresses[0]);

    });
    afterAll(async () => {
        await node1.node.stop();
        await node2.node.stop();
    });
    test('test that we have peers in the swarm', async () => {
        let node1_peers = await node1.GetSwarmPeers();
        let node2_peers = await node2.GetSwarmPeers();
        console.log('node1 peers', node1_peers, 'node 2 id', node2.id);
        console.log('node2 peers', node2_peers, 'node 1 id', node1.id);
        expect(node1_peers.id).toMatch(node2.id);
        expect(node2_peers.id).toMatch(node1.id);
    });

    test('test that peers auto-connect to the newly discovered peers in the swarm', async () => {

        let node1_peers = await node1.GetConnectedPeers();
        expect(node1_peers.length).toBe(2);

    });
    test('test that peers in swarm communicate', async () => {

        await new Promise(res => setTimeout(() => {
            expect(this.other_nodes.length).toBe(1);
        }, 15000))


    });
});
