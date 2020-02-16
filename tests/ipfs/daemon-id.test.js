describe('Test Daemon basic functions', () => {
    it('should test that we can retrieve daemon id ', async() => {

        const ipfsClient = require("ipfs-http-client");
        let ipfs = ipfsClient('http://localhost:5001');
        const identity = await ipfs.id();
        expect(identity).toHaveProperty('id');
    })
});