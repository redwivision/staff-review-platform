import React, { useState } from "react";
import { ActivityLog, UserProfile } from "../types";
import { Clock, Search, Filter, FileText, CheckCircle2, User, RefreshCw, Trash2, Calendar } from "lucide-react";

interface ActivityLogProps {
  logs: ActivityLog[];
  staffProfiles: UserProfile[];
  isLeader: boolean;
  onClearLogs?: () => void;
}

export default function ActivityLogList({ logs, staffProfiles, isLeader, onClearLogs }: ActivityLogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setLogPage(1);
  };

  const handleStaffChange = (val: string) => {
    setSelectedStaff(val);
    setLogPage(1);
  };

  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    setLogPage(1);
  };

  // Sort logs by timestamp descending
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  // Filter logs
  const filteredLogs = sortedLogs.filter(log => {
    const matchesSearch = 
      log.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.editedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStaff = selectedStaff === "all" || log.userId === selectedStaff;
    const matchesType = selectedType === "all" || log.activityType === selectedType;

    return matchesSearch && matchesStaff && matchesType;
  });

  // Paginated logs
  const totalLogs = filteredLogs.length;
  const totalLogPages = Math.max(1, Math.ceil(totalLogs / logsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (logPage - 1) * logsPerPage,
    logPage * logsPerPage
  );

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getLogIcon = (activityType: "review" | "summary", action: string) => {
    if (action.toLowerCase().includes("submit") || action.toLowerCase().includes("finalize")) {
      return (
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    }
    if (activityType === "summary") {
      return (
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
        <Clock className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-sans font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Evaluation Activity Log
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Real-time history of development review updates and leader summary modifications.
          </p>
        </div>
        
        {isLeader && onClearLogs && logs.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear the activity logs?")) {
                onClearLogs();
              }
            }}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 border border-rose-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log History
          </button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by staff, editor, or action..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedStaff}
            onChange={(e) => handleStaffChange(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
          >
            <option value="all">All Staff Members</option>
            {staffProfiles.map(staff => (
              <option key={staff.uid} value={staff.uid}>{staff.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
          >
            <option value="all">All Document Types</option>
            <option value="review">Reviews Only</option>
            <option value="summary">Summaries Only</option>
          </select>
        </div>
      </div>

      {/* Logs Feed */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
          <p className="text-slate-400 text-xs font-semibold">No evaluation activities logged yet.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Edits and submissions will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden border border-slate-150 rounded-xl">
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {paginatedLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start justify-between p-4 hover:bg-slate-50/80 transition-colors gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5">
                      {getLogIcon(log.activityType, log.action)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">
                          {log.staffName}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {log.quarter} Quarter ({log.year})
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          log.activityType === "review" 
                            ? "bg-slate-50 text-slate-700 border-slate-200" 
                            : "bg-indigo-50 text-indigo-700 border-indigo-100"
                        }`}>
                          {log.activityType === "review" ? "Development Review" : "Summary Evaluation"}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs font-medium">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <User className="w-3 h-3 text-slate-300" />
                        <span>By {log.editedBy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-300" />
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs Pagination */}
          {totalLogPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs font-medium text-slate-500">
              <span>
                Showing <strong>{Math.min(totalLogs, (logPage - 1) * logsPerPage + 1)}</strong> to{" "}
                <strong>{Math.min(totalLogs, logPage * logsPerPage)}</strong> of{" "}
                <strong>{totalLogs}</strong> activities
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                  disabled={logPage === 1}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    logPage === 1
                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  Prev
                </button>
                <span className="px-2 font-bold text-slate-700">
                  {logPage} / {totalLogPages}
                </span>
                <button
                  type="button"
                  onClick={() => setLogPage(prev => Math.min(totalLogPages, prev + 1))}
                  disabled={logPage === totalLogPages}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    logPage === totalLogPages
                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
