let canv = document.querySelector('canvas')
let ctx = canv.getContext('2d')

canv.width = document.body.clientWidth
canv.height = document.body.clientHeight

const HOST = '127.0.0.1'
const PORT = '9000'

const PI = Math.PI
const TAU = 2 * Math.PI

let clients = {}
let selfInfo = {}

let objectx = 100
let objecty = 100

function cjson(message) {
    return JSON.stringify(message)
}

function updateCanvas() {
    ctx.fillStyle = '#FFF'
    ctx.fillRect(0, 0, canv.width, canv.height)
    Object.keys(clients).forEach(key => {
        let el = clients[key]
        ctx.beginPath()
        ctx.fillStyle = '#000'
        ctx.arc(el.x, el.y, 5, 0, TAU)
        ctx.fill()
    })
    requestAnimationFrame(updateCanvas)
}

requestAnimationFrame(updateCanvas)


const ws = new WebSocket(`ws://${HOST}:${PORT}`);
// обработчик проинформирует в консоль когда соединение установится
ws.onopen = function () {
    console.log('подключился');
};
// обработчик сообщений от сервера
ws.onmessage = function (message) {
    let data = JSON.parse(message.data)
    console.log(message.data)
    switch (data.type) {
        case 'postconnect':
            clients = data.clients
            selfInfo = clients[data.selfIndex]
            break;
        case 'newUser':
            console.log(data)
            if (data.info.index === selfInfo.index) break;
            clients[data.info.index] = data.info
            break;
        case 'update':
            Object.keys(data.info).forEach(key => {
                let client = data.info[key]
                clients[key].x = client.x
                clients[key].y = client.y
            })
            break;
        case 'close':
            delete clients[data.index]
            break;
    }
};
// функция для отправки echo-сообщений на сервер
function wsSendEcho(value) {
    ws.send(JSON.stringify({action: 'ECHO', data: value.toString()}));
}
// функция для отправки команды ping на сервер
function wsSendPing() {
    ws.send(JSON.stringify({action: 'PING'}));
}

document.addEventListener('keydown', ev => {
    switch (ev.key) {
        case 'w':
            ws.send(cjson({'type': 'startMove', 'direction': 'top'}))
            break;
        case 'a':
            ws.send(cjson({'type': 'startMove', 'direction': 'left'}))
            break;
        case 's':
            ws.send(cjson({'type': 'startMove', 'direction': 'bottom'}))
            break;
        case 'd':
            ws.send(cjson({'type': 'startMove', 'direction': 'right'}))
            break;
    }
})

document.addEventListener('keyup', ev => {
    switch (ev.key) {
        case 'w':
            ws.send(cjson({'type': 'stopMove', 'direction': 'top'}))
            break;
        case 'a':
            ws.send(cjson({'type': 'stopMove', 'direction': 'left'}))
            break;
        case 's':
            ws.send(cjson({'type': 'stopMove', 'direction': 'bottom'}))
            break;
        case 'd':
            ws.send(cjson({'type': 'stopMove', 'direction': 'right'}))
            break;
    }
})