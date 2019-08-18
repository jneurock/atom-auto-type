'use babel';

import { File } from 'atom';

export function getFile(filePath) {
  let [projectPath] = atom.project.getPaths();

  return new File(`${projectPath}/${filePath}`);
}
