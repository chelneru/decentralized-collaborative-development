"use strict";

const helpers = require('../../app/misc/helpers');
import IpfsSystem from '../../app/p2p-system/ipfs-p2p-system.js';


describe('Test Helpers functions', () => {
    test('should test that we can encrypt a string', async() => {
        let ipfsInstance = await IpfsSystem.create();
        let string ='testing message';
        let encryptedText = helpers.encryptString(ipfsInstance.node,string);


        expect(typeof encryptedText).toBe('string');    })
});