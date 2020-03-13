describe('Test if we can start Hyperdrive', () => {
    it('should test that we can initialize the hyperdrive', async () => {

        let dat_node = new DatSystem();
        const daemon = await IPFS.create({
            repo: os.homedir() + '/.jsipfs-test',
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
        });
        expect(daemon).not.toBeNull();
        daemon.stop();
    });
});
