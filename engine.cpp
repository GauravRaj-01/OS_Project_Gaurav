#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <sstream>
#include <queue>
#include <cmath>
#include <map>
#include <iomanip>
using namespace std;

struct ProcessInput {
    int arrival;
    int burst;
    int priority;
    string pid;
    int original_index;
};

struct ProcessResult {
    string pid;
    int arrival;
    int burst;
    int priority;
    int finish;
    int turnaround;
    int waiting;
};

struct TimelineInterval {
    string pid;
    int start;
    int end;
};

string escapeJsonString(const string& s) {
    return "\"" + s + "\"";
}

vector<string> split(const string& s, char delimiter) {
    vector<string> tokens;
    string token;
    istringstream tokenStream(s);
    while (getline(tokenStream, token, delimiter)) {
        if (!token.empty()) {
            tokens.push_back(token);
        }
    }
    return tokens;
}

void runCPU(const string& algo, int quantum, const string& processes_str) {
    vector<ProcessInput> inputs;
    vector<string> proc_tokens = split(processes_str, ';');
    
    for (size_t i = 0; i < proc_tokens.size(); ++i) {
        vector<string> parts = split(proc_tokens[i], ',');
        if (parts.size() >= 3) {
            ProcessInput p;
            p.arrival = stoi(parts[0]);
            p.burst = stoi(parts[1]);
            p.priority = stoi(parts[2]);
            p.pid = (parts.size() >= 4) ? parts[3] : "P" + to_string(i + 1);
            p.original_index = i;
            inputs.push_back(p);
        }
    }

    if (inputs.empty()) {
        cout << "{\"error\":\"No processes provided\"}" << endl;
        return;
    }

    int n = inputs.size();
    vector<TimelineInterval> timeline;
    vector<ProcessResult> results(n);
    for (int i = 0; i < n; ++i) {
        results[i].pid = inputs[i].pid;
        results[i].arrival = inputs[i].arrival;
        results[i].burst = inputs[i].burst;
        results[i].priority = inputs[i].priority;
        results[i].finish = 0;
        results[i].turnaround = 0;
        results[i].waiting = 0;
    }

    if (algo == "fcfs") {
        vector<ProcessInput> sorted_inputs = inputs;
        sort(sorted_inputs.begin(), sorted_inputs.end(), [](const ProcessInput& a, const ProcessInput& b) {
            if (a.arrival != b.arrival) return a.arrival < b.arrival;
            return a.original_index < b.original_index;
        });

        int t = 0;
        for (const auto& p : sorted_inputs) {
            if (t < p.arrival) {
                timeline.push_back({"IDLE", t, p.arrival});
                t = p.arrival;
            }
            int start = t;
            int end = t + p.burst;
            timeline.push_back({p.pid, start, end});
            t = end;

            for (int i = 0; i < n; ++i) {
                if (results[i].pid == p.pid) {
                    results[i].finish = end;
                    results[i].turnaround = end - p.arrival;
                    results[i].waiting = results[i].turnaround - p.burst;
                    break;
                }
            }
        }
    } 
    else if (algo == "sjf") {
        vector<bool> completed(n, false);
        int completed_count = 0;
        int t = 0;

        while (completed_count < n) {
            int selected_idx = -1;
            int min_burst = 1e9;

            for (int i = 0; i < n; ++i) {
                if (!completed[i] && inputs[i].arrival <= t) {
                    if (inputs[i].burst < min_burst) {
                        min_burst = inputs[i].burst;
                        selected_idx = i;
                    } else if (inputs[i].burst == min_burst) {
                        if (inputs[i].arrival < inputs[selected_idx].arrival) {
                            selected_idx = i;
                        } else if (inputs[i].arrival == inputs[selected_idx].arrival) {
                            if (inputs[i].original_index < inputs[selected_idx].original_index) {
                                selected_idx = i;
                            }
                        }
                    }
                }
            }

            if (selected_idx == -1) {
                int next_arrival = 1e9;
                for (int i = 0; i < n; ++i) {
                    if (!completed[i]) {
                        next_arrival = min(next_arrival, inputs[i].arrival);
                    }
                }
                timeline.push_back({"IDLE", t, next_arrival});
                t = next_arrival;
            } else {
                int start = t;
                int end = t + inputs[selected_idx].burst;
                timeline.push_back({inputs[selected_idx].pid, start, end});
                t = end;

                results[selected_idx].finish = end;
                results[selected_idx].turnaround = end - inputs[selected_idx].arrival;
                results[selected_idx].waiting = results[selected_idx].turnaround - inputs[selected_idx].burst;

                completed[selected_idx] = true;
                completed_count++;
            }
        }
    } 
    else if (algo == "srtf") {
        vector<int> remaining_burst(n);
        for (int i = 0; i < n; ++i) remaining_burst[i] = inputs[i].burst;

        vector<bool> completed(n, false);
        int completed_count = 0;
        int t = 0;

        vector<ProcessInput> sorted_by_arrival = inputs;
        sort(sorted_by_arrival.begin(), sorted_by_arrival.end(), [](const ProcessInput& a, const ProcessInput& b) {
            if (a.arrival != b.arrival) return a.arrival < b.arrival;
            return a.original_index < b.original_index;
        });
        int arrival_ptr = 0;

        while (completed_count < n) {
            int selected_idx = -1;
            int min_remaining = 1e9;

            for (int i = 0; i < n; ++i) {
                if (!completed[i] && inputs[i].arrival <= t) {
                    if (remaining_burst[i] < min_remaining) {
                        min_remaining = remaining_burst[i];
                        selected_idx = i;
                    } else if (remaining_burst[i] == min_remaining) {
                        if (inputs[i].arrival < inputs[selected_idx].arrival) {
                            selected_idx = i;
                        } else if (inputs[i].arrival == inputs[selected_idx].arrival) {
                            if (inputs[i].original_index < inputs[selected_idx].original_index) {
                                selected_idx = i;
                            }
                        }
                    }
                }
            }

            if (selected_idx == -1) {
                int next_arrival = sorted_by_arrival[arrival_ptr].arrival;
                timeline.push_back({"IDLE", t, next_arrival});
                t = next_arrival;
                while (arrival_ptr < n && sorted_by_arrival[arrival_ptr].arrival <= t) {
                    arrival_ptr++;
                }
            } else {
                int slice = remaining_burst[selected_idx];
                int next_arrival_time = 1e9;

                for (int i = 0; i < n; ++i) {
                    if (inputs[i].arrival > t) {
                        if (inputs[i].arrival < next_arrival_time) {
                            next_arrival_time = inputs[i].arrival;
                        }
                    }
                }

                if (next_arrival_time < t + slice) {
                    slice = next_arrival_time - t;
                }

                if (!timeline.empty() && timeline.back().pid == inputs[selected_idx].pid) {
                    timeline.back().end = t + slice;
                } else {
                    timeline.push_back({inputs[selected_idx].pid, t, t + slice});
                }

                t += slice;
                remaining_burst[selected_idx] -= slice;

                if (remaining_burst[selected_idx] == 0) {
                    results[selected_idx].finish = t;
                    results[selected_idx].turnaround = t - inputs[selected_idx].arrival;
                    results[selected_idx].waiting = results[selected_idx].turnaround - inputs[selected_idx].burst;
                    completed[selected_idx] = true;
                    completed_count++;
                }

                while (arrival_ptr < n && sorted_by_arrival[arrival_ptr].arrival <= t) {
                    arrival_ptr++;
                }
            }
        }
    }
    else if (algo == "priority") {
        vector<bool> completed(n, false);
        int completed_count = 0;
        int t = 0;

        while (completed_count < n) {
            int selected_idx = -1;
            int best_priority = 1e9;

            for (int i = 0; i < n; ++i) {
                if (!completed[i] && inputs[i].arrival <= t) {
                    if (inputs[i].priority < best_priority) {
                        best_priority = inputs[i].priority;
                        selected_idx = i;
                    } else if (inputs[i].priority == best_priority) {
                        if (inputs[i].arrival < inputs[selected_idx].arrival) {
                            selected_idx = i;
                        } else if (inputs[i].arrival == inputs[selected_idx].arrival) {
                            if (inputs[i].original_index < inputs[selected_idx].original_index) {
                                selected_idx = i;
                            }
                        }
                    }
                }
            }

            if (selected_idx == -1) {
                int next_arrival = 1e9;
                for (int i = 0; i < n; ++i) {
                    if (!completed[i]) {
                        next_arrival = min(next_arrival, inputs[i].arrival);
                    }
                }
                timeline.push_back({"IDLE", t, next_arrival});
                t = next_arrival;
            } else {
                int start = t;
                int end = t + inputs[selected_idx].burst;
                timeline.push_back({inputs[selected_idx].pid, start, end});
                t = end;

                results[selected_idx].finish = end;
                results[selected_idx].turnaround = end - inputs[selected_idx].arrival;
                results[selected_idx].waiting = results[selected_idx].turnaround - inputs[selected_idx].burst;

                completed[selected_idx] = true;
                completed_count++;
            }
        }
    } 
    else if (algo == "rr") {
        // ── FIXED Round Robin ──────────────────────────────────────────────
        // Key rules:
        //  1. Sort all processes by arrival, then original_index for stable ordering.
        //  2. At each step, add newly-arrived processes to the ready queue BEFORE
        //     re-queuing the current process if it still has burst left.
        //  3. When CPU is idle, jump to the next arrival and enqueue it.

        // Work on a copy sorted by arrival so we can march an arrival pointer
        vector<ProcessInput> sorted_by_arrival = inputs;
        sort(sorted_by_arrival.begin(), sorted_by_arrival.end(), [](const ProcessInput& a, const ProcessInput& b) {
            if (a.arrival != b.arrival) return a.arrival < b.arrival;
            return a.original_index < b.original_index;
        });

        vector<int> remaining_burst(n);
        for (int i = 0; i < n; ++i) remaining_burst[i] = inputs[i].burst;

        // Map from pid -> original index in inputs[]
        map<string, int> pid_to_idx;
        for (int i = 0; i < n; ++i) pid_to_idx[inputs[i].pid] = i;

        queue<int> ready; // stores original_index values
        int arrival_ptr = 0; // next process in sorted_by_arrival to consider
        int t = 0;
        int completed_count = 0;

        // Enqueue all processes that have arrived by time t (not yet enqueued)
        auto enqueue_arrivals = [&](int current_time) {
            while (arrival_ptr < n && sorted_by_arrival[arrival_ptr].arrival <= current_time) {
                int orig_idx = sorted_by_arrival[arrival_ptr].original_index;
                ready.push(orig_idx);
                arrival_ptr++;
            }
        };

        // Seed initial arrivals
        enqueue_arrivals(t);

        while (completed_count < n) {
            if (ready.empty()) {
                // CPU idle: jump to next unscheduled process's arrival
                int next_arrival = sorted_by_arrival[arrival_ptr].arrival;
                timeline.push_back({"IDLE", t, next_arrival});
                t = next_arrival;
                enqueue_arrivals(t);
                continue;
            }

            int curr_idx = ready.front();
            ready.pop();

            int slice = min(remaining_burst[curr_idx], quantum);
            int start = t;
            int end = t + slice;
            timeline.push_back({inputs[curr_idx].pid, start, end});
            t = end;
            remaining_burst[curr_idx] -= slice;

            // Enqueue processes that arrived DURING this slice (before re-queuing current)
            enqueue_arrivals(t);

            if (remaining_burst[curr_idx] > 0) {
                // Re-queue current process AFTER newly arrived ones
                ready.push(curr_idx);
            } else {
                results[curr_idx].finish = t;
                results[curr_idx].turnaround = t - inputs[curr_idx].arrival;
                results[curr_idx].waiting = results[curr_idx].turnaround - inputs[curr_idx].burst;
                completed_count++;
            }
        }
        // ── END FIXED Round Robin ──────────────────────────────────────────
    }

    double total_waiting = 0;
    double total_turnaround = 0;
    for (int i = 0; i < n; ++i) {
        total_waiting += results[i].waiting;
        total_turnaround += results[i].turnaround;
    }
    double avg_waiting = total_waiting / n;
    double avg_turnaround = total_turnaround / n;

    cout << "{" << endl;
    cout << "  \"timeline\": [" << endl;
    for (size_t i = 0; i < timeline.size(); ++i) {
        cout << "    {\"pid\": " << escapeJsonString(timeline[i].pid) 
             << ", \"start\": " << timeline[i].start 
             << ", \"end\": " << timeline[i].end << "}";
        if (i < timeline.size() - 1) cout << ",";
        cout << endl;
    }
    cout << "  ]," << endl;
    cout << "  \"processes\": [" << endl;
    for (int i = 0; i < n; ++i) {
        cout << "    {\"pid\": " << escapeJsonString(results[i].pid)
             << ", \"arrival\": " << results[i].arrival
             << ", \"burst\": " << results[i].burst
             << ", \"priority\": " << results[i].priority
             << ", \"finish\": " << results[i].finish
             << ", \"turnaround\": " << results[i].turnaround
             << ", \"waiting\": " << results[i].waiting << "}";
        if (i < n - 1) cout << ",";
        cout << endl;
    }
    cout << "  ]," << endl;
    cout << "  \"metrics\": {" << endl;
    cout << "    \"avg_waiting\": " << fixed << setprecision(3) << avg_waiting << "," << endl;
    cout << "    \"avg_turnaround\": " << fixed << setprecision(3) << avg_turnaround << endl;
    cout << "  }" << endl;
    cout << "}" << endl;
}

void runDisk(const string& algo, int initial_head, int disk_size, const string& requests_str) {
    vector<int> requests;
    vector<string> req_tokens = split(requests_str, ',');
    for (const auto& token : req_tokens) {
        requests.push_back(stoi(token));
    }

    if (requests.empty()) {
        cout << "{\"error\":\"No requests provided\"}" << endl;
        return;
    }

    vector<int> sequence;
    vector<int> seek_steps;
    int total_seek = 0;
    int current_head = initial_head;
    
    sequence.push_back(current_head);

    if (algo == "fcfs") {
        for (int req : requests) {
            int dist = abs(req - current_head);
            total_seek += dist;
            seek_steps.push_back(dist);
            sequence.push_back(req);
            current_head = req;
        }
    } 
    else if (algo == "sstf") {
        vector<int> remaining = requests;
        while (!remaining.empty()) {
            int closest_idx = -1;
            int min_dist = 1e9;
            for (size_t i = 0; i < remaining.size(); ++i) {
                int dist = abs(remaining[i] - current_head);
                if (dist < min_dist) {
                    min_dist = dist;
                    closest_idx = i;
                }
            }
            int next_track = remaining[closest_idx];
            total_seek += min_dist;
            seek_steps.push_back(min_dist);
            sequence.push_back(next_track);
            current_head = next_track;
            remaining.erase(remaining.begin() + closest_idx);
        }
    } 
    else if (algo == "scan") {
        vector<int> left, right;
        for (int req : requests) {
            if (req < initial_head) left.push_back(req);
            else right.push_back(req);
        }
        sort(left.begin(), left.end());
        sort(right.begin(), right.end());

        for (int req : right) {
            int dist = abs(req - current_head);
            total_seek += dist;
            seek_steps.push_back(dist);
            sequence.push_back(req);
            current_head = req;
        }

        if (!left.empty()) {
            int boundary = disk_size - 1;
            if (current_head != boundary) {
                int dist = abs(boundary - current_head);
                total_seek += dist;
                seek_steps.push_back(dist);
                sequence.push_back(boundary);
                current_head = boundary;
            }

            for (int i = left.size() - 1; i >= 0; --i) {
                int req = left[i];
                int dist = abs(req - current_head);
                total_seek += dist;
                seek_steps.push_back(dist);
                sequence.push_back(req);
                current_head = req;
            }
        }
    } 
    else if (algo == "cscan") {
        vector<int> left, right;
        for (int req : requests) {
            if (req < initial_head) left.push_back(req);
            else right.push_back(req);
        }
        sort(left.begin(), left.end());
        sort(right.begin(), right.end());

        for (int req : right) {
            int dist = abs(req - current_head);
            total_seek += dist;
            seek_steps.push_back(dist);
            sequence.push_back(req);
            current_head = req;
        }

        if (!left.empty()) {
            int boundary = disk_size - 1;
            if (current_head != boundary) {
                int dist = abs(boundary - current_head);
                total_seek += dist;
                seek_steps.push_back(dist);
                sequence.push_back(boundary);
                current_head = boundary;
            }

            int dist_to_start = boundary;
            total_seek += dist_to_start;
            seek_steps.push_back(dist_to_start);
            sequence.push_back(0);
            current_head = 0;

            for (int req : left) {
                int dist = abs(req - current_head);
                total_seek += dist;
                seek_steps.push_back(dist);
                sequence.push_back(req);
                current_head = req;
            }
        }
    } 
    else if (algo == "look") {
        vector<int> left, right;
        for (int req : requests) {
            if (req < initial_head) left.push_back(req);
            else right.push_back(req);
        }
        sort(left.begin(), left.end());
        sort(right.begin(), right.end());

        for (int req : right) {
            int dist = abs(req - current_head);
            total_seek += dist;
            seek_steps.push_back(dist);
            sequence.push_back(req);
            current_head = req;
        }

        if (!left.empty()) {
            for (int i = left.size() - 1; i >= 0; --i) {
                int req = left[i];
                int dist = abs(req - current_head);
                total_seek += dist;
                seek_steps.push_back(dist);
                sequence.push_back(req);
                current_head = req;
            }
        }
    }
    else if (algo == "clook") {
        vector<int> left, right;
        for (int req : requests) {
            if (req < initial_head) left.push_back(req);
            else right.push_back(req);
        }
        sort(left.begin(), left.end());
        sort(right.begin(), right.end());

        for (int req : right) {
            int dist = abs(req - current_head);
            total_seek += dist;
            seek_steps.push_back(dist);
            sequence.push_back(req);
            current_head = req;
        }

        if (!left.empty()) {
            for (int req : left) {
                int dist = abs(req - current_head);
                total_seek += dist;
                seek_steps.push_back(dist);
                sequence.push_back(req);
                current_head = req;
            }
        }
    }

    cout << "{" << endl;
    cout << "  \"sequence\": [" << endl;
    for (size_t i = 0; i < sequence.size(); ++i) {
        cout << "    " << sequence[i];
        if (i < sequence.size() - 1) cout << ",";
        cout << endl;
    }
    cout << "  ]," << endl;
    cout << "  \"seek_steps\": [" << endl;
    for (size_t i = 0; i < seek_steps.size(); ++i) {
        cout << "    " << seek_steps[i];
        if (i < seek_steps.size() - 1) cout << ",";
        cout << endl;
    }
    cout << "  ]," << endl;
    cout << "  \"total_seek\": " << total_seek << endl;
    cout << "}" << endl;
}

int main(int argc, char* argv[]) {
    if (argc < 4) {
        cout << "{\"error\":\"Missing arguments\"}" << endl;
        return 1;
    }

    string mode = argv[1];
    string algo = argv[2];

    if (mode == "cpu") {
        if (argc < 5) {
            cout << "{\"error\":\"CPU requires quantum and processes arguments\"}" << endl;
            return 1;
        }
        int quantum = stoi(argv[3]);
        string processes_str = argv[4];
        runCPU(algo, quantum, processes_str);
    } 
    else if (mode == "disk") {
        if (argc < 6) {
            cout << "{\"error\":\"Disk requires initial_head, disk_size and requests arguments\"}" << endl;
            return 1;
        }
        int initial_head = stoi(argv[3]);
        int disk_size = stoi(argv[4]);
        string requests_str = argv[5];
        runDisk(algo, initial_head, disk_size, requests_str);
    } 
    else {
        cout << "{\"error\":\"Unknown mode: " << mode << "\"}" << endl;
        return 1;
    }

    return 0;
}