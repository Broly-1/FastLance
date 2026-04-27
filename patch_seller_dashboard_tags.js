const fs = require('fs');
const file = 'client/src/pages/SellerDashboard.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state for available tags
if (!code.includes('availableTags')) {
  code = code.replace(
    "const [tags, setTags] = useState('');",
    "const [availableTags, setAvailableTags] = useState([]);\n  const [tags, setTags] = useState([]);"
  );
  
  // Add fetch inside useEffect
  const fetchTagsStr = `
  useEffect(() => {
    const fetchSystemTags = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/tags');
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(data);
        }
      } catch (err) {
        console.error("Error fetching tags", err);
      }
    };
    fetchSystemTags();
  }, []);
`;
  code = code.replace("// Fetch Seller's Gigs", fetchTagsStr + "\n  // Fetch Seller's Gigs");
}

// 2. Change how gig tags are processed in handleCreateGig
const gigTagsProcessStr = `const gigTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (gigTags.length > 0) {
        await Promise.all(gigTags.map(tag => 
          fetch(\`http://localhost:3000/api/gigs/\${newGigId}/tags\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tag })
          })
        ));
      }`;

const newGigTagsProcessStr = `if (tags.length > 0) {
        await Promise.all(tags.map(tag => 
          fetch(\`http://localhost:3000/api/gigs/\${newGigId}/tags\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tag }) // Backend resolves by name currently, or we pass tag if it expects name
          })
        ));
      }`;

if (code.includes(gigTagsProcessStr)) {
  code = code.replace(gigTagsProcessStr, newGigTagsProcessStr);
}

// 3. Change form input for tags
const oldTagsInput = `<input type="text" value={tags} onChange={e=>setTags(e.target.value)} className="brand-input" placeholder="react, tailwind, node..." />`;
const newTagsInput = `<div className="flex flex-wrap gap-3 mt-2">
                  {availableTags.length === 0 ? (
                    <p className="text-sm text-slate-500">No tags available (Admins can add tags).</p>
                  ) : (
                    availableTags.map((tag) => (
                      <label key={tag.tag_id} className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          value={tag.name}
                          checked={tags.includes(tag.name)}
                          onChange={(e) => {
                            if (e.target.checked) setTags([...tags, tag.name]);
                            else setTags(tags.filter(t => t !== tag.name));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#0f699e] focus:ring-[#0f699e]"
                        />
                        {tag.name}
                      </label>
                    ))
                  )}
                </div>`;

if (code.includes(oldTagsInput)) {
  code = code.replace(oldTagsInput, newTagsInput);
}

fs.writeFileSync(file, code);
console.log("Patched SellerDashboard.jsx");
