let peerUpdateIntervalId = null;

$(document).ready(function () {
    UpdatePeerInfo();
    UpdatePeerInitialInfo();
    $('.publish-repository').on('click', function () {
        let project_id = $('.project_id').val();
        PublishRepository(project_id);
    });
    $('.update-repository').on('click', function () {
        let project_id = $('.project_id').val();
        UpdateRepository(project_id);
    });

    setTimeout(function () {
        $('.git-iframe').attr('src', 'http://localhost:3001');
        $('.gitbug-iframe').attr('src', 'http://localhost:3002');
        $('.chat-iframe').attr('src', 'http://localhost:3003');
    }, 2000);

    window.onmessage = function (event) {
        if (event.data === 'start-git-bug-iframe') {
            if ($('.webui-iframe').attr('src') === "") {
                setTimeout(function () {

                    $('.webui-iframe').attr('src', 'http://localhost:3010');
                }, 2000);

            }
        }
    };
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

function UpdateRepository(projectId) {
    $.ajax({
        url: 'http://localhost:3000/node/update-repo',
        type: 'POST',
        data: {project_id: projectId},
        dataType: 'json',
        success(response) {
            if (response.status === true) {
                console.log('successfully updated the repo');
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

            if (response.swarm_peers !== undefined) {
                $('.peers-row .row-value .peers-count').text(response.swarm_peers.length);
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

function UpdatePeerInitialInfo() {
    $.ajax({
        url: 'http://localhost:3000/node/initial-info',
        type: 'POST',
        dataType: 'json',
        success(response) {
            if (response.localAddrs !== undefined) {
                $('.local-addrs-row .row-value').text(response.localAddrs);
            }
            if (response.peer_id !== undefined) {
                $('.id-row .row-value').text(response.peer_id);
            }
            if (response.project_name !== undefined) {
                $('.project-row .row-value .project-text').text(response.project_name);
            }
            if (response.swarmKeyContents !== undefined) {
                $('.swarm-key-row .row-value').text(response.swarmKeyContents);
            }

        }
        ,
        error(jqXHR, status, errorThrown) {
            console.log(jqXHR);

        }
    });
}

