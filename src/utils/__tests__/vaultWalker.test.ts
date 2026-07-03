import { TAbstractFile, TFile } from 'obsidian';
import { makeMockFolder } from '@fixtures';
import { walkVaultTree } from 'src/utils';

describe('walkVaultTree', () => {
  it('should invoke onFile for every file in a nested tree', () => {
    // Arrange
    const fileA = new TFile();
    const fileB = new TFile();
    const fileC = new TFile();
    const roots = [
      fileA,
      makeMockFolder('l1Folder1', 'l1Folder1', [
        fileB,
        makeMockFolder('l2Folder1', 'l1Folder1/l2Folder1', [fileC]),
      ]),
    ];
    const onFile = jest.fn();

    // Act
    walkVaultTree(roots, { onFile });

    // Assert
    expect(onFile).toHaveBeenCalledTimes(3);
    expect(onFile).toHaveBeenCalledWith(fileA);
    expect(onFile).toHaveBeenCalledWith(fileB);
    expect(onFile).toHaveBeenCalledWith(fileC);
  });

  it('should invoke onFolder for each non-excluded folder', () => {
    // Arrange
    const l2Folder = makeMockFolder('l2Folder1', 'l1Folder1/l2Folder1');
    const l1Folder = makeMockFolder('l1Folder1', 'l1Folder1', [l2Folder]);
    const onFolder = jest.fn();

    // Act
    walkVaultTree([l1Folder], { onFile: jest.fn(), onFolder });

    // Assert
    expect(onFolder).toHaveBeenCalledTimes(2);
    expect(onFolder).toHaveBeenCalledWith(l1Folder);
    expect(onFolder).toHaveBeenCalledWith(l2Folder);
  });

  it('should not invoke onFolder for the root folder while still traversing its children', () => {
    // Arrange
    const file = new TFile();
    const root = makeMockFolder('', '/', [file]);
    root.isRoot = () => true;
    const onFile = jest.fn();
    const onFolder = jest.fn();

    // Act
    walkVaultTree([root], { onFile, onFolder });

    // Assert
    expect(onFolder).not.toHaveBeenCalled();
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('should prune excluded folders without invoking onFolder or visiting descendants', () => {
    // Arrange
    const includedFile = new TFile();
    const excludedFile = new TFile();
    const excludedFolder = makeMockFolder('excluded', 'excluded', [excludedFile]);
    const includedFolder = makeMockFolder('included', 'included', [includedFile]);
    const onFile = jest.fn();
    const onFolder = jest.fn();

    // Act
    walkVaultTree([excludedFolder, includedFolder], {
      onFile,
      onFolder,
      shouldExcludeFolder: (folderPath) => folderPath === 'excluded',
    });

    // Assert
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(includedFile);
    expect(onFolder).toHaveBeenCalledTimes(1);
    expect(onFolder).toHaveBeenCalledWith(includedFolder);
  });

  it('should ignore nodes that are neither files nor folders', () => {
    // Arrange
    const bareNode = { path: 'not-a-file-or-folder' } as TAbstractFile;
    const onFile = jest.fn();
    const onFolder = jest.fn();

    // Act
    walkVaultTree([bareNode], { onFile, onFolder });

    // Assert
    expect(onFile).not.toHaveBeenCalled();
    expect(onFolder).not.toHaveBeenCalled();
  });

  it('should accept a Set of root nodes', () => {
    // Arrange
    const file = new TFile();
    const onFile = jest.fn();

    // Act
    walkVaultTree(new Set<TAbstractFile>([file]), { onFile });

    // Assert
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('should not mutate the roots collection', () => {
    // Arrange
    const roots = [new TFile(), makeMockFolder('l1Folder1', 'l1Folder1', [new TFile()])];
    const rootsCopy = [...roots];

    // Act
    walkVaultTree(roots, { onFile: jest.fn() });

    // Assert
    expect(roots).toEqual(rootsCopy);
  });

  it('should visit files in pop-from-end depth-first order', () => {
    // Arrange
    const fileA = new TFile();
    const fileB = new TFile();
    const fileC = new TFile();
    const roots = [fileA, makeMockFolder('l1Folder1', 'l1Folder1', [fileB, fileC])];
    const visited: TFile[] = [];

    // Act
    walkVaultTree(roots, { onFile: (file) => visited.push(file) });

    // Assert
    // Frontier is a stack seeded in order and popped from the end: the last
    // root is processed first, and a folder's last child before its first.
    expect(visited).toEqual([fileC, fileB, fileA]);
  });
});
