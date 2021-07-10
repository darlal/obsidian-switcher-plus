export const TFile = jest.fn().mockImplementation(() => {
  const basename = 'file-foo';
  const extension = 'bar';
  const name = `${basename}.${extension}`;

  return {
    path: `path/to/${name}`,
    basename,
    extension,
    name,
  };
});

export const WorkspaceLeaf = jest.fn().mockImplementation(() => {
  const view = {
    file: new TFile(),
    getViewType: jest.fn().mockReturnValue('markdown'),
  };

  return {
    view,
  };
});

export const MetadataCache = jest.fn().mockImplementation(() => {
  return {
    getFileCache: jest.fn(),
  };
});

export const Workspace = jest.fn().mockImplementation(() => {
  return {
    iterateAllLeaves: jest.fn(),
  };
});

export const App = jest.fn().mockImplementation(() => {
  return {
    workspace: new Workspace(),
  };
});
