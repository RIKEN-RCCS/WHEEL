import $ from 'jquery';
import Cookies from 'js-cookie';
import '../css/viewer.css';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';

// export default function (viewList) {
$(() => {
    // setup socket.io client
    const sio = io('/workflow');
    sio.on('results', (viewList) => {
        console.log(viewList);
    });

    const filename = Cookies.get('filename');
    const componentID = Cookies.get('componentID');
    const url = Cookies.get('url');
    console.log(url);
    console.log(document.getElementById('viewerImages'));

    let viewerID = $('#viewerImages');
    // for (let index = 0; index < viewList.length; index++) {
    viewerID.append(`<li><img src=${url} alt="HTML"><p>${filename}</p></li>`)
    // }

    var options = {
        ready: function () {
            console.log('ready!!!!!!');
        },
        show: function () {
            console.log('show!!!!!!');
        },
        shown: function () {
            console.log('shown!!!!!!');
        },
        viewed: function () {
            console.log('viewed!!!!!!');
        },
        hide: function () {
            console.log('hide!!!!!!');
        },
        hidden: function () {
            console.log('hidden!!!!!!');
        }
    };
    var viewer = new Viewer(document.getElementById('viewerImages'), options);
    // console.log("test");
});
    //} 
