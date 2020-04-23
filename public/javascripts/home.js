let peerUpdateIntervalId = null;

$(document).ready(function () {
    UpdatePeerInfo();

    $(document).on('click','.row-announce', function () {
        let $row = $(this).closest('.folder-row');
        let folderName = $($row).find('.row-name').text();
        let ipnsName = $($row).find('.row-address').text();
        AnnounceFolder($row, folderName, ipnsName);
    });
});

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
                $('.peers-row .row-value').text(response.swarm_peers.length);
            }
            if (response.folders !== undefined) {
                $('.folders-line').empty();
                for (let foldIter = 0; foldIter < response.folders.length; foldIter++) {
                    CreateFolderRow(response.folders[foldIter].folderName, response.folders[foldIter].ipnsName, response.folders[foldIter].isChanged);

                }
            }

            //initialize the periodic check
            // peerUpdateIntervalId = setInterval(UpdatePeerInfo, 3000);

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
