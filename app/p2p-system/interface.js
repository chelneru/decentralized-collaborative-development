let IpfsSystem = require('./ipfs-p2p-system');

exports.InitializeP2PSystem = async (projectInfo, p2psystem) => {
    switch (p2psystem) {
        case 'ipfs':
            global.node = await IpfsSystem.create({},true);
            console.log('\x1b[33m%s\x1b[0m','node ', global.node.id,' is set');
            break;
    }
}
