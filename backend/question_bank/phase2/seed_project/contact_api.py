"""
联系人管理API — 种子项目
这个项目有几个已知bug需要修复，还需要添加新功能。
"""
import sqlite3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DB_PATH = "contacts.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            company TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("INSERT OR IGNORE INTO contacts (id, name, email, phone, company) VALUES (1, '张三', 'zhang@test.com', '13800138000', '暗物智能')")
    conn.execute("INSERT OR IGNORE INTO contacts (id, name, email, phone, company) VALUES (2, '李四', 'li@test.com', '13912345678', '腾讯')")
    conn.execute("INSERT OR IGNORE INTO contacts (id, name, email, phone, company) VALUES (3, '王五', 'wang@test.com', '18600001111', '阿里巴巴')")
    conn.execute("INSERT OR IGNORE INTO contacts (id, name, email, phone, company) VALUES (4, '赵六', 'zhao@test.com', '15000002222', '字节跳动')")
    conn.execute("INSERT OR IGNORE INTO contacts (id, name, email, phone, company) VALUES (5, '孙七', 'sun@test.com', '17700003333', '暗物智能')")
    conn.commit()
    conn.close()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class ContactHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/contacts":
            self.handle_list(params)
        elif path.startswith("/contacts/"):
            contact_id = path.split("/")[-1]
            self.handle_get_one(contact_id)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/contacts":
            self.handle_create()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/contacts/"):
            contact_id = self.path.split("/")[-1]
            self.handle_delete(contact_id)
        else:
            self.send_error(404)

    def handle_list(self, params):
        conn = get_db()
        page = int(params.get("page", ["1"])[0])
        per_page = int(params.get("per_page", ["10"])[0])

        offset = page * per_page

        rows = conn.execute(
            "SELECT * FROM contacts LIMIT ? OFFSET ?", [per_page, offset]
        ).fetchall()
        conn.close()

        result = [dict(r) for r in rows]
        self.respond_json({"data": result, "page": page, "per_page": per_page})

    def handle_get_one(self, contact_id):
        conn = get_db()
        row = conn.execute(
            f"SELECT * FROM contacts WHERE id = {contact_id}"
        ).fetchone()
        conn.close()

        if row:
            self.respond_json(dict(row))
        else:
            self.send_error(404, "Contact not found")

    def handle_create(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)

        conn = get_db()
        cursor = conn.execute(
            "INSERT INTO contacts (name, email, phone, company) VALUES (?, ?, ?, ?)",
            [data.get("name"), data.get("email"), data.get("phone"), data.get("company")]
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        self.respond_json({"id": new_id, "message": "created"}, 201)

    def handle_delete(self, contact_id):
        conn = get_db()
        conn.execute(f"DELETE FROM contacts WHERE id = {contact_id}")
        conn.commit()
        conn.close()
        self.respond_json({"message": "deleted"})

    def respond_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())


if __name__ == "__main__":
    init_db()
    server = HTTPServer(("0.0.0.0", 8000), ContactHandler)
    print("Server running on :8000")
    server.serve_forever()
