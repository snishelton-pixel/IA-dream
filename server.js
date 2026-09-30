const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
    });

    res.end(`
        <html>
            <head>
                <title>Dream AI</title>
            </head>
            <body>
                <h1>Dream AI está online!</h1>
                <p>Servidor funcionando corretamente.</p>
            </body>
        </html>
    `);
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("DREAM AI INICIADO COM SUCESSO");
    console.log("PORTA:", PORT);
    console.log("=================================");
});       }
