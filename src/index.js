var app = require('./app')
var http = require('http')

var port = '81'
app.set('port', port)

var server = http.createServer(app)

server.listen(port)
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error
    }
    var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port
    switch(error.code) {
        case 'EACCESS':
            console.error(bind + ' requires elevated privileges')
            process.exit(1)
            break
        case 'EADDRINUSE':
            console.error(bind + ' is already in use')
            process.exit(1)
            break
        default:
            throw error
    }
})
server.on('listening', () => {
    var addr = server.address()
    var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
    console.log('Listening on ' + bind)
})