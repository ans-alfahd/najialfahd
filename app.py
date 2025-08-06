import os
import sqlite3
import csv
import io
from flask import Flask, render_template, request, redirect, url_for, send_file, flash, abort

app = Flask(__name__)
app.secret_key = 'replace-this'
DB = 'data.db'


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS incoming_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT,
        subject TEXT,
        entity TEXT,
        date TEXT,
        related_name TEXT,
        status TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS outgoing_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT,
        subject TEXT,
        entity TEXT,
        date TEXT,
        related_name TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS outgoing_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT,
        name TEXT,
        doc_no TEXT,
        date TEXT,
        school TEXT,
        grade TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS incoming_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT,
        name TEXT,
        doc_no TEXT,
        date TEXT,
        school TEXT,
        grade TEXT
    )''')
    conn.commit()
    conn.close()


init_db()


@app.route('/')
def home():
    return render_template('home.html')


@app.route('/search')
def search():
    q = request.args.get('q', '')
    conn = get_db()
    tables = {
        'الكتب الواردة': ('incoming_books', ['number', 'subject', 'entity', 'date', 'related_name', 'status']),
        'الكتب الصادرة': ('outgoing_books', ['number', 'subject', 'entity', 'date', 'related_name']),
        'الوثائق الصادرة': ('outgoing_documents', ['number', 'name', 'doc_no', 'date', 'school', 'grade']),
        'الوثائق الواردة': ('incoming_documents', ['number', 'name', 'doc_no', 'date', 'school', 'grade']),
    }
    data = {}
    for label, (table, headers) in tables.items():
        placeholders = ' OR '.join([f"{h} LIKE ?" for h in headers])
        cur = conn.execute(
            f"SELECT * FROM {table} WHERE {placeholders}",
            tuple(['%' + q + '%'] * len(headers))
        )
        rows = [dict(r) for r in cur.fetchall()]
        data[label] = {'headers': headers, 'rows': rows}
    conn.close()
    return render_template('search_results.html', query=q, data=data)


# Incoming Books
@app.route('/incoming_books', methods=['GET', 'POST'])
def incoming_books():
    conn = get_db()
    c = conn.cursor()
    edit_id = request.args.get('edit')
    if request.method == 'POST':
        id_ = request.form.get('id')
        data = (
            request.form['number'],
            request.form['subject'],
            request.form['entity'],
            request.form['date'],
            request.form['related_name'],
            request.form['status']
        )
        if id_:
            c.execute('''UPDATE incoming_books SET number=?, subject=?, entity=?, date=?, related_name=?, status=? WHERE id=?''', data + (id_,))
            flash('تم التعديل')
        else:
            c.execute('''INSERT INTO incoming_books (number, subject, entity, date, related_name, status) VALUES (?,?,?,?,?,?)''', data)
            flash('تم الحفظ')
        conn.commit()
        conn.close()
        return redirect(url_for('incoming_books'))
    book = None
    if edit_id:
        book = c.execute('SELECT * FROM incoming_books WHERE id=?', (edit_id,)).fetchone()
    books = c.execute('SELECT * FROM incoming_books ORDER BY id DESC').fetchall()
    conn.close()
    return render_template('incoming_books.html', books=books, book=book)


@app.route('/incoming_books/delete/<int:id>')
def delete_incoming_book(id):
    conn = get_db()
    conn.execute('DELETE FROM incoming_books WHERE id=?', (id,))
    conn.commit()
    conn.close()
    flash('تم الحذف')
    return redirect(url_for('incoming_books'))


@app.route('/incoming_books/print/<int:id>')
def print_incoming_book(id):
    conn = get_db()
    row = conn.execute('SELECT number, subject, entity, date, related_name, status FROM incoming_books WHERE id=?', (id,)).fetchone()
    conn.close()
    if not row:
        abort(404)
    return render_template('print_record.html', title='كتاب وارد', record=dict(row))


# Outgoing Books
@app.route('/outgoing_books', methods=['GET', 'POST'])
def outgoing_books():
    conn = get_db()
    c = conn.cursor()
    edit_id = request.args.get('edit')
    if request.method == 'POST':
        id_ = request.form.get('id')
        data = (
            request.form['number'],
            request.form['subject'],
            request.form['entity'],
            request.form['date'],
            request.form['related_name']
        )
        if id_:
            c.execute('''UPDATE outgoing_books SET number=?, subject=?, entity=?, date=?, related_name=? WHERE id=?''', data + (id_,))
            flash('تم التعديل')
        else:
            c.execute('''INSERT INTO outgoing_books (number, subject, entity, date, related_name) VALUES (?,?,?,?,?)''', data)
            flash('تم الحفظ')
        conn.commit()
        conn.close()
        return redirect(url_for('outgoing_books'))
    book = None
    if edit_id:
        book = c.execute('SELECT * FROM outgoing_books WHERE id=?', (edit_id,)).fetchone()
    books = c.execute('SELECT * FROM outgoing_books ORDER BY id DESC').fetchall()
    conn.close()
    return render_template('outgoing_books.html', books=books, book=book)


@app.route('/outgoing_books/delete/<int:id>')
def delete_outgoing_book(id):
    conn = get_db()
    conn.execute('DELETE FROM outgoing_books WHERE id=?', (id,))
    conn.commit()
    conn.close()
    flash('تم الحذف')
    return redirect(url_for('outgoing_books'))


@app.route('/outgoing_books/print/<int:id>')
def print_outgoing_book(id):
    conn = get_db()
    row = conn.execute('SELECT number, subject, entity, date, related_name FROM outgoing_books WHERE id=?', (id,)).fetchone()
    conn.close()
    if not row:
        abort(404)
    return render_template('print_record.html', title='كتاب صادر', record=dict(row))


# Outgoing Documents
@app.route('/outgoing_documents', methods=['GET', 'POST'])
def outgoing_documents():
    conn = get_db()
    c = conn.cursor()
    edit_id = request.args.get('edit')
    if request.method == 'POST':
        id_ = request.form.get('id')
        data = (
            request.form['number'],
            request.form['name'],
            request.form['doc_no'],
            request.form['date'],
            request.form['school'],
            request.form['grade']
        )
        if id_:
            c.execute('''UPDATE outgoing_documents SET number=?, name=?, doc_no=?, date=?, school=?, grade=? WHERE id=?''', data + (id_,))
            flash('تم التعديل')
        else:
            c.execute('''INSERT INTO outgoing_documents (number, name, doc_no, date, school, grade) VALUES (?,?,?,?,?,?)''', data)
            flash('تم الحفظ')
        conn.commit()
        conn.close()
        return redirect(url_for('outgoing_documents'))
    doc = None
    if edit_id:
        doc = c.execute('SELECT * FROM outgoing_documents WHERE id=?', (edit_id,)).fetchone()
    docs = c.execute('SELECT * FROM outgoing_documents ORDER BY id DESC').fetchall()
    conn.close()
    return render_template('outgoing_documents.html', docs=docs, doc=doc)


@app.route('/outgoing_documents/delete/<int:id>')
def delete_outgoing_document(id):
    conn = get_db()
    conn.execute('DELETE FROM outgoing_documents WHERE id=?', (id,))
    conn.commit()
    conn.close()
    flash('تم الحذف')
    return redirect(url_for('outgoing_documents'))


@app.route('/outgoing_documents/print/<int:id>')
def print_outgoing_document(id):
    conn = get_db()
    row = conn.execute('SELECT number, name, doc_no, date, school, grade FROM outgoing_documents WHERE id=?', (id,)).fetchone()
    conn.close()
    if not row:
        abort(404)
    return render_template('print_record.html', title='وثيقة صادرة', record=dict(row))


# Incoming Documents
@app.route('/incoming_documents', methods=['GET', 'POST'])
def incoming_documents():
    conn = get_db()
    c = conn.cursor()
    edit_id = request.args.get('edit')
    if request.method == 'POST':
        id_ = request.form.get('id')
        data = (
            request.form['number'],
            request.form['name'],
            request.form['doc_no'],
            request.form['date'],
            request.form['school'],
            request.form['grade']
        )
        if id_:
            c.execute('''UPDATE incoming_documents SET number=?, name=?, doc_no=?, date=?, school=?, grade=? WHERE id=?''', data + (id_,))
            flash('تم التعديل')
        else:
            c.execute('''INSERT INTO incoming_documents (number, name, doc_no, date, school, grade) VALUES (?,?,?,?,?,?)''', data)
            flash('تم الحفظ')
        conn.commit()
        conn.close()
        return redirect(url_for('incoming_documents'))
    doc = None
    if edit_id:
        doc = c.execute('SELECT * FROM incoming_documents WHERE id=?', (edit_id,)).fetchone()
    docs = c.execute('SELECT * FROM incoming_documents ORDER BY id DESC').fetchall()
    conn.close()
    return render_template('incoming_documents.html', docs=docs, doc=doc)


@app.route('/incoming_documents/delete/<int:id>')
def delete_incoming_document(id):
    conn = get_db()
    conn.execute('DELETE FROM incoming_documents WHERE id=?', (id,))
    conn.commit()
    conn.close()
    flash('تم الحذف')
    return redirect(url_for('incoming_documents'))


@app.route('/incoming_documents/print/<int:id>')
def print_incoming_document(id):
    conn = get_db()
    row = conn.execute('SELECT number, name, doc_no, date, school, grade FROM incoming_documents WHERE id=?', (id,)).fetchone()
    conn.close()
    if not row:
        abort(404)
    return render_template('print_record.html', title='وثيقة واردة', record=dict(row))


# Print all
TABLE_INFO = {
    'incoming_books': {'title': 'الكتب الواردة', 'headers': ['number', 'subject', 'entity', 'date', 'related_name', 'status']},
    'outgoing_books': {'title': 'الكتب الصادرة', 'headers': ['number', 'subject', 'entity', 'date', 'related_name']},
    'outgoing_documents': {'title': 'الوثائق الصادرة', 'headers': ['number', 'name', 'doc_no', 'date', 'school', 'grade']},
    'incoming_documents': {'title': 'الوثائق الواردة', 'headers': ['number', 'name', 'doc_no', 'date', 'school', 'grade']},
}


@app.route('/print_all/<table>')
def print_all(table):
    info = TABLE_INFO.get(table)
    if not info:
        abort(404)
    conn = get_db()
    rows = [dict(r) for r in conn.execute(f'SELECT * FROM {table}').fetchall()]
    conn.close()
    headers = info['headers']
    for row in rows:
        for key in list(row.keys()):
            if key not in headers:
                row.pop(key)
    return render_template('print_all.html', title=info['title'], headers=headers, rows=rows)


# Export/Import
@app.route('/export/<table>')
def export_table(table):
    info = TABLE_INFO.get(table)
    if not info:
        abort(404)
    conn = get_db()
    rows = [dict(r) for r in conn.execute(f'SELECT * FROM {table}').fetchall()]
    conn.close()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=info['headers'])
    writer.writeheader()
    for row in rows:
        writer.writerow({h: row.get(h, '') for h in info['headers']})
    mem = io.BytesIO()
    mem.write(output.getvalue().encode('utf-8'))
    mem.seek(0)
    return send_file(mem, mimetype='text/csv', as_attachment=True, download_name=f'{table}.csv')


@app.route('/import/<table>', methods=['GET', 'POST'])
def import_table_form(table):
    info = TABLE_INFO.get(table)
    if not info:
        abort(404)
    if request.method == 'POST':
        file = request.files['data']
        if file:
            stream = io.StringIO(file.stream.read().decode('utf-8'))
            reader = csv.DictReader(stream)
            conn = get_db()
            cols = ','.join(info['headers'])
            placeholders = ','.join(['?'] * len(info['headers']))
            for row in reader:
                conn.execute(f'INSERT INTO {table} ({cols}) VALUES ({placeholders})', tuple(row[h] for h in info['headers']))
            conn.commit()
            conn.close()
            flash('تم الاستيراد')
            return redirect(url_for(table))
    return render_template('import_table.html')


# Backup/Restore
@app.route('/backup')
def backup():
    if not os.path.exists(DB):
        open(DB, 'a').close()
    return send_file(DB, as_attachment=True, download_name='backup.db')


@app.route('/restore', methods=['GET', 'POST'])
def restore_form():
    if request.method == 'POST':
        file = request.files['backup']
        if file:
            file.save(DB)
            flash('تمت الاستعادة')
            return redirect(url_for('home'))
    return render_template('restore.html')


if __name__ == '__main__':
    app.run(debug=True)
