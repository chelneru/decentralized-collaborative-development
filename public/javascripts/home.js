let peerUpdateIntervalId = null;

$(document).ready(function () {
    UpdatePeerInfo();

  $('.publish-repository').on('click',function () {
      let project_id = $('.project_id').val();

      PublishRepository(project_id);
  });

});

function PublishRepository(projectId) {
    $.ajax({
        url: 'http://localhost:3000/node/publish-repo',
        type: 'POST',
        data: {project_id: projectId},
        dataType: 'json',
        success(response) {
            if (response.status === true) {
                console.log('successfully published the repo');
            }
        },
        error(jqXHR, status, errorThrown) {
            console.log(jqXHR);

        }
    });
}


function UpdatePeerInfo() {
    $.ajax({
        url: 'http://localhost:3000/node/info',
        type: 'POST',
        dataType: 'json',
        success(response) {
            if (response.localAddrs !== undefined) {
                $('.local-addrs-row .row-value').text(response.localAddrs);
            }
            if (response.swarm_peers !== undefined) {
                $('.peers-row .row-value .peers-count').text(response.swarm_peers.length);
            }
            if (response.peer_id !== undefined) {
                $('.id-row .row-value').text(response.peer_id);
            }
            if (response.project_name !== undefined) {
                $('.project-row .row-value').text(response.project_name);
            }

            //initialize the periodic check
            if (peerUpdateIntervalId === null) {
                peerUpdateIntervalId = setInterval(UpdatePeerInfo, 3000);
            }

        }
        ,
        error(jqXHR, status, errorThrown) {
            console.log(jqXHR);

        }
    });
}

