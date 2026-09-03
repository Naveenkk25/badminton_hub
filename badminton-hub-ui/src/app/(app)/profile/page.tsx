"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { User, Phone, Save, Edit3, UploadCloud, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/Players/${user?.id}`, {
        fullName: fullName,
        mobileNumber: user?.phoneNumber,
        email: "", // add email state if needed
        category: user?.category
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
      // Ideally force auth context to refresh user here
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      await api.post(`/Players/${user?.id}/profile-picture`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Profile picture updated");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    try {
      setIsUploading(true);
      await api.delete(`/Players/${user?.id}/profile-picture`);
      toast.success("Profile picture removed");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error("Failed to remove profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-court-blue/10 text-court-blue"
        >
          <User className="h-6 w-6" />
        </motion.div>
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground font-medium">Manage your personal information and preferences.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Summary Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-1"
        >
          <Card className="border-border/50 shadow-sm text-center">
            <CardContent className="pt-6">
              <div className="relative mx-auto w-24 h-24 mb-4">
                <Avatar className="h-24 w-24 ring-4 ring-muted">
                  <AvatarImage src={user?.profilePictureUrl ? `http://localhost:5032${user.profilePictureUrl}` : undefined} />
                  <AvatarFallback className="bg-court-blue text-white text-3xl font-bold">
                    {user?.fullName?.split(" ").map(n => n[0]).join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="h-8 w-8 rounded-full bg-background"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <UploadCloud className="h-4 w-4" />
                    </Button>
                    {user?.profilePictureUrl && (
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="h-8 w-8 rounded-full"
                        onClick={handleRemovePicture}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload} 
                />
              </div>
              <h3 className="text-xl font-bold font-heading mb-1">{user?.fullName || "User Name"}</h3>
              <p className="text-sm text-muted-foreground font-medium mb-4">{user?.role}</p>
              
              <div className="inline-flex items-center justify-center bg-court-green/10 text-court-green px-3 py-1 rounded-full text-sm font-semibold mb-6">
                Status: Active
              </div>

              <div className="w-full h-[1px] bg-border/50 mb-6"></div>

              <div className="space-y-3 text-left">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4 mr-3" />
                  {user?.phoneNumber || "No phone number"}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Profile Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2"
        >
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      readOnly={!isEditing} 
                      className={!isEditing ? "bg-muted/50" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <Input id="mobileNumber" defaultValue={user?.phoneNumber} disabled className="bg-muted/50" />
                  </div>
                </div>

                {isEditing && (
                  <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setFullName(user?.fullName || "");
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-court-blue hover:bg-court-blue-light text-white">
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
