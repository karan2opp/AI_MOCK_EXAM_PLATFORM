"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, UserCheck, Search, User, Mail, Shield } from "lucide-react";
import { assignRoleService, searchUserService } from "./admin.service";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSearching(true);
    setSearchedUser(null);
    try {
      const res = await searchUserService(email.trim());
      setSearchedUser(res.data);
      toast.success("User found");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "User not found");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignRole = async () => {
    if (!searchedUser) return;

    setIsAssigning(true);
    try {
      await assignRoleService({ email: searchedUser.email, role: "teacher" });
      toast.success(`Successfully assigned teacher role to ${searchedUser.email}`);
      // Refresh the searched user to reflect new role
      const res = await searchUserService(searchedUser.email);
      setSearchedUser(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign role");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="p-10 flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h2>
        <p className="text-gray-400 mt-1">Manage platform users and role assignments.</p>
      </header>

      {/* Find & Manage User Section */}
      <Card className="bg-[#111520] border-white/5 border-l-4 border-l-purple-500 max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-xl text-white">Find User</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Search for a registered user by email to view their details or assign roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4 items-center">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@university.edu"
              className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
              required
            />
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold min-w-[120px]"
              disabled={isSearching || !email.trim()}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>

          {searchedUser && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">User Details</h3>
              <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-white font-medium">{searchedUser.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-white font-medium">{searchedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Current Role</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1
                      ${searchedUser.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        searchedUser.role === 'teacher' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}
                    >
                      {searchedUser.role}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 mt-4 border-t border-white/5 flex justify-end">
                  {searchedUser.role === "student" ? (
                    <Button 
                      onClick={handleAssignRole}
                      disabled={isAssigning}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {isAssigning ? "Assigning..." : "Assign Teacher Role"}
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      This user cannot be assigned the teacher role because they are already a {searchedUser.role}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3 text-sm text-yellow-200/80">
            <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <p>
              Users must be registered in the system before they can be searched or assigned a role. 
              The default role for all new sign-ups is "student".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
