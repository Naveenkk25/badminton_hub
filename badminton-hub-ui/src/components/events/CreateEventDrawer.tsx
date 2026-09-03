"use client";

import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface CreateEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventToEdit?: any;
}

const createEventSchema = z.object({
  name: z.string().min(1, "Event Name is required"),
  venue: z.string().min(1, "Venue is required"),
  eventDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  reservedFee: z.string().min(1, "Reserved fee is required"),
  maxPlayers: z.string().min(1, "Max players is required"),
  cutoffDateTime: z.string().min(1, "Cutoff is required"),
  category: z.string().min(1, "Category is required"),
});

export function CreateEventDrawer({ open, onOpenChange, eventToEdit }: CreateEventDrawerProps) {
  const { user, refreshUser } = useAuth();
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, setValue } = useForm({
    resolver: zodResolver(createEventSchema),
    mode: "onTouched"
  });
  
  const [expandedSections, setExpandedSections] = useState<string[]>(["basic"]);

  // Watch fields to trigger auto-expand
  const basicFields = useWatch({ control, name: ["name", "venue", "category"] });
  const scheduleFields = useWatch({ control, name: ["eventDate", "startTime", "endTime", "cutoffDateTime"] });

  useEffect(() => {
    if (open) {
      if (eventToEdit) {
        setValue("name", eventToEdit.name);
        setValue("venue", eventToEdit.venue);
        setValue("eventDate", eventToEdit.eventDate.split('T')[0]);
        setValue("startTime", eventToEdit.startTime.substring(0, 5));
        setValue("endTime", eventToEdit.endTime.substring(0, 5));
        setValue("reservedFee", eventToEdit.reservedFee.toString());
        setValue("maxPlayers", eventToEdit.maxPlayers.toString());
        setValue("cutoffDateTime", eventToEdit.cutoffDateTime.substring(0, 16));
        setValue("category", eventToEdit.category);
        setExpandedSections(["basic", "schedule", "capacity"]); // Open all for editing
      } else {
        reset();
        setExpandedSections(["basic"]);
      }
    }
  }, [open, eventToEdit, setValue, reset]);

  // Auto-expand logic
  useEffect(() => {
    if (open && !eventToEdit) {
      const isBasicFilled = basicFields[0] && basicFields[1] && basicFields[2];
      if (isBasicFilled && !expandedSections.includes("schedule")) {
        setExpandedSections(prev => [...prev, "schedule"]);
      }

      const isScheduleFilled = scheduleFields[0] && scheduleFields[1] && scheduleFields[2] && scheduleFields[3];
      if (isBasicFilled && isScheduleFilled && !expandedSections.includes("capacity")) {
        setExpandedSections(prev => [...prev, "capacity"]);
      }
    }
  }, [basicFields, scheduleFields, open, eventToEdit]);

  const queryClient = useQueryClient();

  const { data: orgData } = useQuery({
    queryKey: ["my-org-info", user?.id],
    queryFn: async () => {
      if (!user?.phoneNumber) return null;
      const response = await api.get("/Organizers");
      return response.data.find((item: any) => item.org.contactNumber === user.phoneNumber)?.org;
    },
    enabled: !!user?.phoneNumber && user?.role === "Organizer"
  });

  const onSubmit = async (data: any) => {
    try {
      let orgId = "00000000-0000-0000-0000-000000000000";
      if (user?.role === "Organizer") {
        orgId = orgData?.id;
      }
      
      if (!orgId) {
        toast.error("Invalid organizer context");
        return;
      }
      
      const payload = {
        organizerId: orgId,
        name: data.name,
        venue: data.venue,
        eventDate: data.eventDate,
        startTime: data.startTime + ":00",
        endTime: data.endTime + ":00",
        reservedFee: Number(data.reservedFee),
        category: data.category,
        maxPlayers: Number(data.maxPlayers),
        cutoffDateTime: data.cutoffDateTime
      };

      if (eventToEdit) {
        await api.put(`/Events/${eventToEdit.id}`, payload);
        toast.success("Event updated successfully!");
      } else {
        await api.post("/Events", payload);
        toast.success("Event created successfully!");
      }
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["credit-history"] });
      queryClient.invalidateQueries({ queryKey: ["eventDetails"] });
      refreshUser();
      onOpenChange(false);
      if (!eventToEdit) reset();
    } catch (error: any) {
      const errData = error?.response?.data;
      let errMsg = "Failed to create event. Please check details.";
      if (errData?.error) errMsg = errData.error;
      else if (errData?.errors) errMsg = (Object.values(errData.errors)[0] as string[])?.[0] || errMsg;
      else if (errData?.title) errMsg = errData.title;
      toast.error(errMsg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col h-full">
        <SheetHeader className="mb-6 shrink-0">
          <SheetTitle className="text-2xl font-heading flex items-center gap-2">
            {eventToEdit ? "Edit Event" : "Create Event"}
          </SheetTitle>
          <SheetDescription className="mt-2 font-medium">
            Fill out the details below. Sections will auto-expand as you progress.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 h-full">
          <div className="flex-1 overflow-y-auto pb-6">
            <Accordion 
              value={expandedSections} 
              onValueChange={setExpandedSections}
              className="w-full space-y-4"
            >
              <AccordionItem value="basic" className="border bg-surface rounded-xl px-4 shadow-sm border-slate-200 dark:border-slate-800">
                <AccordionTrigger className="hover:no-underline font-bold text-foreground">
                  Basic Details
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="space-y-2">
                    <Label>Event Name</Label>
                    <Input {...register("name")} placeholder="e.g. Sunday Morning Smash" className="rounded-xl" />
                    {errors.name && <span className="text-xs text-match-red">{errors.name.message?.toString()}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input {...register("venue")} placeholder="e.g. City Sports Arena" className="rounded-xl" />
                    {errors.venue && <span className="text-xs text-match-red">{errors.venue.message?.toString()}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select 
                      {...register("category")} 
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select Category</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Plus">Plus</option>
                    </select>
                    {errors.category && <span className="text-xs text-match-red">{errors.category.message?.toString()}</span>}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="schedule" className="border bg-surface rounded-xl px-4 shadow-sm border-slate-200 dark:border-slate-800">
                <AccordionTrigger className="hover:no-underline font-bold text-foreground">
                  Schedule
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Input type="date" {...register("eventDate")} className="rounded-xl" />
                    {errors.eventDate && <span className="text-xs text-match-red">{errors.eventDate.message?.toString()}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" {...register("startTime")} className="rounded-xl" />
                      {errors.startTime && <span className="text-xs text-match-red">{errors.startTime.message?.toString()}</span>}
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" {...register("endTime")} className="rounded-xl" />
                      {errors.endTime && <span className="text-xs text-match-red">{errors.endTime.message?.toString()}</span>}
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label>Registration Cutoff Date & Time</Label>
                    <Input type="datetime-local" {...register("cutoffDateTime")} className="rounded-xl" />
                    {errors.cutoffDateTime && <span className="text-xs text-match-red">{errors.cutoffDateTime.message?.toString()}</span>}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="capacity" className="border bg-surface rounded-xl px-4 shadow-sm border-slate-200 dark:border-slate-800">
                <AccordionTrigger className="hover:no-underline font-bold text-foreground">
                  Capacity & Pricing
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="space-y-2">
                    <Label>Max Players</Label>
                    <Input type="number" {...register("maxPlayers")} placeholder="e.g. 16" className="rounded-xl" />
                    {errors.maxPlayers && <span className="text-xs text-match-red">{errors.maxPlayers.message?.toString()}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label>Reserved Fee (CAD)</Label>
                    <Input type="number" {...register("reservedFee")} placeholder="e.g. 20" className="rounded-xl" />
                    {errors.reservedFee && <span className="text-xs text-match-red">{errors.reservedFee.message?.toString()}</span>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="pt-6 shrink-0 flex justify-between border-t mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-court-blue hover:bg-court-blue-light text-white w-32 rounded-xl">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {eventToEdit ? "Update Event" : "Publish Event"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
