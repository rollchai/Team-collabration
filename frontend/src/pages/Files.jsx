import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  FolderOpen,
  Upload,
  Search,
  Download,
  FileText,
  Image,
  FileCode,
  File as FileIcon,
  Loader2,
  HardDrive,
  Database,
  BarChart3,
  Layers
} from 'lucide-react';
import API from '../services/api';
import { toast } from 'react-toastify';

const Files = () => {
  const { currentWorkspace } = useSelector((state) => state.workspace);

  // States
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  // Load files
  const loadFiles = () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    API.get(`/files?workspaceId=${currentWorkspace._id}`)
      .then((res) => {
        setFiles(res.data.files);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        toast.error('Failed to load shared files');
      });
  };

  useEffect(() => {
    loadFiles();
  }, [currentWorkspace]);

  // Handle file upload click
  const handleUploadSubmit = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', currentWorkspace._id);

    setUploading(true);
    try {
      await API.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Successfully uploaded ${file.name}`);
      loadFiles(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Filtered files list based on search query
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate dynamic stats
  const totalFiles = files.length;
  const totalSizeBytes = files.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const formattedTotalSize = 
    totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

  const imageCount = files.filter(f => f.mimeType?.startsWith('image/')).length;
  const documentCount = files.filter(f => 
    f.mimeType?.startsWith('text/') || 
    f.mimeType?.includes('pdf') || 
    f.mimeType?.includes('word') ||
    f.mimeType?.includes('presentation') ||
    f.mimeType?.includes('spreadsheet')
  ).length;

  const codeCount = files.filter(f =>
    f.mimeType?.includes('javascript') || 
    f.mimeType?.includes('json') || 
    f.mimeType?.includes('html') || 
    f.mimeType?.includes('css') ||
    f.mimeType?.includes('typescript')
  ).length;

  // File Icon helper with gorgeous gradient/glow wrapper
  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) {
      return (
        <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
          <Image className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (mimeType?.startsWith('text/') || mimeType?.includes('pdf') || mimeType?.includes('word') || mimeType?.includes('document')) {
      return (
        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
          <FileText className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (mimeType?.includes('javascript') || mimeType?.includes('json') || mimeType?.includes('html') || mimeType?.includes('css') || mimeType?.includes('code')) {
      return (
        <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
          <FileCode className="h-4.5 w-4.5" />
        </div>
      );
    }
    return (
      <div className="h-9 w-9 rounded-xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20 text-slate-500 dark:text-slate-400">
        <FileIcon className="h-4.5 w-4.5" />
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 gap-4">
        <div>
          <h1 className="font-heading text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Shared Assets
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
              {totalFiles} file{totalFiles !== 1 ? 's' : ''}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access files shared across group chats and upload new assets to your workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex items-center bg-white/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 rounded-xl px-3.5 py-2 shadow-2xs text-sm backdrop-blur-md focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all duration-200">
            <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-white outline-none w-full sm:w-52 placeholder-slate-400"
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4.5 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-55 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Upload className="h-4.5 w-4.5" />
            )}
            Upload File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadSubmit}
            className="hidden"
          />
        </div>
      </div>

      {/* Workspace Stats/Analytics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Card 1 */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Total Storage Used</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{formattedTotalSize}</h4>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Image className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Images Shared</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{imageCount}</h4>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Documents</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{documentCount}</h4>
          </div>
        </div>

        {/* Stat Card 4 */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <FileCode className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Source Files</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{codeCount}</h4>
          </div>
        </div>
      </div>

      {/* Files List Display */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-400 bg-white/60 dark:bg-slate-950/25 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-12 backdrop-blur-md max-w-full shadow-lg transition-all">
          <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-600 mb-4 border border-slate-100 dark:border-slate-800 shadow-inner">
            <FolderOpen className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-200">No assets in workspace</h3>
          <p className="text-xs text-slate-500 dark:text-slate-450 max-w-sm mt-1 leading-relaxed">
            {searchQuery 
              ? `We couldn't find any files matching "${searchQuery}". Try a different keyword.` 
              : 'Upload project templates, specification documents, or screenshots to share them instantly with your teammates.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => fileInputRef.current.click()}
              className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-emerald-500/35 px-4.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-emerald-500" />
              Upload First Asset
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full table-fixed divide-y divide-slate-200/40 dark:divide-slate-800/60">
              {/* Table Header */}
              <thead className="bg-slate-50/40 dark:bg-slate-950/20">
                <tr className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200/40 dark:border-slate-800/60">
                  <th scope="col" className="w-[50%] px-6 py-4 text-left font-extrabold">Name</th>
                  <th scope="col" className="w-[15%] px-6 py-4 text-left font-extrabold">Size</th>
                  <th scope="col" className="w-[20%] px-6 py-4 text-left font-extrabold">Uploaded By</th>
                  <th scope="col" className="w-[15%] px-6 py-4 text-right font-extrabold">Actions</th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-850/60 bg-transparent">
                {filteredFiles.map((file) => (
                  <tr
                    key={file._id}
                    className="hover:bg-white/40 dark:hover:bg-slate-900/10 text-xs transition-colors duration-150 group"
                  >
                    {/* File Name */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3 max-w-full">
                        {getFileIcon(file.mimeType)}
                        <span className="font-bold text-slate-700 dark:text-slate-250 truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        {file.size > 1024 * 1024
                          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(file.size / 1024).toFixed(1)} KB`}
                      </span>
                    </td>

                    {/* Uploaded By */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={file.uploadedBy?.avatar}
                          alt={file.uploadedBy?.name}
                          className="h-6 w-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-950 shadow-2xs shrink-0"
                        />
                        <span className="font-semibold text-slate-655 dark:text-slate-300 truncate max-w-[120px]">
                          {file.uploadedBy?.name}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-emerald-500/35 hover:bg-emerald-50/20 px-3 py-1.5 text-3xs font-extrabold text-slate-600 dark:border-slate-800 dark:hover:bg-emerald-950/20 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all cursor-pointer"
                        title="Download/Open File"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Files;

