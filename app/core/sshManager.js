const db = new Map();

function addSsh(projectRootDir, id, ssh) {
  if (!db.has(projectRootDir)) {
    db.set(projectRootDir, new Map());
  }
  db.get(projectRootDir).set(id, ssh);
}
function getSsh(projectRootDir, id) {
  if (!db.has(projectRootDir)) {
    const err = new Error("ssh instance is not registerd for the project");
    err.projectRootDir = projectRootDir;
    throw err;
  }
  return db.get(projectRootDir).get(id);
}
function removeSsh(projectRootDir) {
  const target = db.get(projectRootDir);
  if (!target) {
    return;
  }
  for (const e of target.values()) {
    e.disconnect();
  }
  db.get(projectRootDir).clear();
}

module.exports = {
  addSsh,
  getSsh,
  removeSsh
};
