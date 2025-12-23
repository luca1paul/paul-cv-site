# Optional: nicer status styling

Your script currently renders `Status` as plain text.
If you want a nicer look (badges + colored row hint), do this:

## 1) Add these CSS rules inside your `<style>` block
```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: .02em;
}
.badge--online { background: rgba(34, 197, 94, .18); border: 1px solid rgba(34, 197, 94, .35); color: #9ae6b4; }
.badge--offline { background: rgba(239, 68, 68, .18); border: 1px solid rgba(239, 68, 68, .35); color: #fecaca; }

tr.is-offline td { opacity: .78; }
tr.is-offline td:first-child { text-decoration: line-through; }
```

## 2) Wrap the Status cell content in a badge
Replace the Status `<td>` with something like:
```python
status = r.get("Status", "UNKNOWN")
badge_class = "badge--online" if status == "ONLINE" else "badge--offline"
status_html = f'<span class="badge {badge_class}">{escape(status)}</span>'
...
f"<td>{status_html}</td>"
```

## 3) Add a class on the `<tr>` for offline rows
```python
row_class = "is-offline" if status != "ONLINE" else ""
html_rows.append(f'<tr class="{row_class}"> ... </tr>')
```
