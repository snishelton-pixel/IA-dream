const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer(function (req, res) {
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Dream AI está funcionando!");
});

server.listen(PORT, "0.0.0.0", function () {
    console.log("DREAM AI ONLINE");
    console.log("PORTA: " + PORT);
});
