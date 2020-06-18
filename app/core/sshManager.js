const db = new Map();

function addSsh(projectRootDir, hostInfo, ssh) {
  if (!db.has(projectRootDir)) {
    db.set(projectRootDir, new Map());
  }
  db.get(projectRootDir).set(hostInfo.id, { ssh: ssh, host: hostInfo });
}
function getSsh(projectRootDir, id) {
  if (!db.has(projectRootDir)) {
    const err = new Error("ssh instance is not registerd for the project");
    err.projectRootDir = projectRootDir;
    throw err;
  }
  return db.get(projectRootDir).get(id)["ssh"];
}
function getSshHost(projectRootDir, id) {
  if (!db.has(projectRootDir)) {
    const err = new Error("ssh instance is not registerd for the project");
    err.projectRootDir = projectRootDir;
    throw err;
  }
  return db.get(projectRootDir).get(id)["host"];
}
function removeSsh(projectRootDir) {
  const target = db.get(projectRootDir);
  if (!target) {
    return;
  }
  for (const e of target.values()) {
    e["ssh"].disconnect();
  }
  db.get(projectRootDir).clear();
}

module.exports = {
  addSsh,
  getSsh,
  getSshHost,
  removeSsh
};
