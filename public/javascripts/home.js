let peerUpdateIntervalId = null;

$(document).ready(function () {
    UpdatePeerInfo();

  $('.publish-repository').on('click',function () {
      let project_id = $('.project_id').val();

      PublishRepository(project_id);
  });
    $('.download-swarm-key').on('click', function () {
        let project_id = $('.project_id').val();
       GetSwarmKeyContent(project_id);
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

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
function GetSwarmKeyContent(projectId) {
    $.ajax({
        url: 'http://localhost:3000/node/get-swarm-key',
        type: 'POST',
        data: {project_id: projectId},
        dataType: 'json',
        success(response) {
            if (response.status === true) {
                //serve the swarm key
                download('swarm.key',response.content);
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
            if (response.folders !== undefined) {
                $('.folders-line').empty();
                for (let foldIter = 0; foldIter < response.folders.length; foldIter++) {
                    CreateFolderRow(response.folders[foldIter].folderName, response.folders[foldIter].ipnsName, response.folders[foldIter].isChanged);

                }
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

function AnnounceFolder($row, folderName, ipnsName) {
    $.ajax({
        url: 'http://localhost:3000/node/folder-announce',
        type: 'POST',
        dataType: 'json',
        data: {
            folderName: folderName,
            ipnsName: ipnsName
        },
        success(response) {
            if (response.status === true) {
                $($row).find('.row-status').text('unchanged').css('color', 'green');
                // $($row).find('.row-announce').prop('disabled', true);
            }
        }
        ,
        error(jqXHR, status, errorThrown) {
            console.log(jqXHR);

        }
    });
}

function CreateFolderRow(folderName, folderAddr, status) {
    let $row = $('<div>', {
        class: 'folder-row'
    });
    let $label = $('<div>', {
        class: 'row-label',
        text: 'Folders:'
    });
    let $name = $('<div>', {
        class: 'row-name',
        text: folderName
    });
    let $addr = $('<div>', {
        class: 'row-address',
        text: folderAddr
    });

    let $status = $('<div>', {
        class: 'row-status',
        text: status === false ? 'unchanged' : 'changed'
    });


    let $announce = $('<button>', {
        class: 'row-announce',
        text: 'announce'
    });
    if (status === false) {
        $($status).css('color', 'green');
        // $($announce).prop('disabled',true);
    } else {
        $($status).css('color', 'red');

    }
    $($row).append($label, $status, $name, $addr, $announce);
    $($row).appendTo($('.folders-line'));
}
