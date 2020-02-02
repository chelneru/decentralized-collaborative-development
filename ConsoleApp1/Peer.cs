using Ipfs.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace ConsoleApp1
{
    class Peer
    {
        public readonly IpfsClient ipfs;
        private string repoPath;
        private Ipfs.Peer ipfsPeer;
        public Peer()
        {
            this.ipfs = new IpfsClient();
            //ipfsPeer = await ipfs.IdAsync();
            //TODO

        }

        public async void InitiateIPFS(Boolean isBootstrap)
        {
            ipfsPeer = await ipfs.IdAsync();
        }

        public async System.Threading.Tasks.Task<IEnumerable<Ipfs.Peer>> GetConnectedPeers()
        {
            //TODO
            return await ipfs.Swarm.PeersAsync();
        }
        public async System.Threading.Tasks.Task<Ipfs.IFileSystemNode> BroadcastFileData(string path)
        {
            //TODO
            return await ipfs.FileSystem.AddFileAsync(path);

        }
        public async System.Threading.Tasks.Task<Ipfs.IFileSystemNode> BroadcastStream(System.IO.Stream stream)
        {
            //TODO
            return await ipfs.FileSystem.AddAsync(stream);

        }
        ~Peer()
        {
            //TODO

        }
    }
}
