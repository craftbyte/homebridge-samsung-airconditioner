from http.server import HTTPServer, BaseHTTPRequestHandler
from optparse import OptionParser
import ssl


class RequestHandler(BaseHTTPRequestHandler):
   
    
    def do_GET(self):
        
        request_path = self.path
        
        print("\n----- Request Start ----->\n")
        print(request_path)
        print(self.headers)
        print("<----- Request End -----\n")
        
        self.send_response(200)
        self.send_header("Set-Cookie", "foo=bar")
    
    def do_POST(self):
        
        request_path = self.path
        
        print("\n----- Request Start ----->\n")
        print(request_path)
        
        request_headers = self.headers
        content_length = request_headers.get_params(header='content-length')
        length = int(content_length[0][0]) if content_length else 28
        
        print(request_headers)
        body = self.rfile.read(length)
        print(body.decode('utf-8'))
        print("<----- Request End -----\n")
        
        self.send_response(200)
    
    do_PUT = do_POST
    do_DELETE = do_GET

def main():
    port = 8889
    print('Listening on localhost:%s' % port)
    server = HTTPServer(('', port), RequestHandler)
    server.socket = ssl.wrap_socket(server.socket, certfile='./ac14k_m.pem', server_side=True)
    server.serve_forever()


if __name__ == "__main__":
                    
    main()
