import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskInsight } from '../../../types';
import { TaskCard } from '../molecules';
import { SearchBox } from '../molecules';
import { Button, Badge, Icon } from '../atoms';
import { ErrorBoundary } from '../atoms/ErrorBoundary';
import { BaseComponentProps, LoadingProps } from '../../../types/components';

// TaskList specific props
export interface TaskListProps extends BaseComponentProps, LoadingProps {
  tasks: Task[];
  insights: TaskInsight[];
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onCreateTask?: () => void;
  showFilters?: boolean;
  showSearch?: boolean;
  emptyState?: {
    icon: string;
    title: string;
    description: string;
    action?: React.ReactNode;
  };
}

// Filter and sort options
type SortOption = 'name' | 'progress' | 'priority' | 'created' | 'dueDate';
type FilterOption = 'all' | 'stuck' | 'high-priority' | 'completed' | 'in-progress';

/**
 * TaskList Organism Component
 * Complex task list with filtering, sorting, and search capabilities
 */
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  insights,
  onTaskClick,
  onTaskUpdate,
  onCreateTask,
  showFilters = true,
  showSearch = true,
  emptyState,
  isLoading = false,
  className = '',
  'data-testid': testId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      const insight = insights.find((i) => i.isStuck) || {
        isStuck: false,
        daysInCurrentState: 0,
        recommendedAction: null,
        motivationTip: '',
      };

      switch (filterBy) {
        case 'stuck':
          return insight.isStuck;
        case 'high-priority':
          return task.priority === 'critical' || task.priority === 'high';
        case 'completed':
          return task.progress >= 100;
        case 'in-progress':
          return task.progress > 0 && task.progress < 100;
        default:
          return true;
      }
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'dueDate':
          if (a.dueDate && b.dueDate) {
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          } else if (a.dueDate) {
            comparison = -1;
          } else if (b.dueDate) {
            comparison = 1;
          }
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, insights, searchQuery, sortBy, filterBy, sortOrder]);

  // Get filter counts
  const getFilterCount = (filter: FilterOption) => {
    return tasks.filter((task) => {
      const insight = insights.find((i) => i.isStuck) || {
        isStuck: false,
        daysInCurrentState: 0,
        recommendedAction: null,
        motivationTip: '',
      };

      switch (filter) {
        case 'stuck':
          return insight.isStuck;
        case 'high-priority':
          return task.priority === 'critical' || task.priority === 'high';
        case 'completed':
          return task.progress >= 100;
        case 'in-progress':
          return task.progress > 0 && task.progress < 100;
        default:
          return true;
      }
    }).length;
  };

  return (
    <ErrorBoundary level="organism">
      <div className={`space-y-6 ${className}`} data-testid={testId}>
        {/* Header with controls */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Icon name="task" size="lg" />
              Tasks
              <Badge variant="secondary" size="sm">
                {filteredAndSortedTasks.length}
              </Badge>
            </h2>
          </div>

          {onCreateTask && (
            <Button variant="primary" onClick={onCreateTask} disabled={isLoading}>
              <Icon name="add" size="sm" />
              New Task
            </Button>
          )}
        </motion.div>

        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <motion.div
            className="flex flex-col lg:flex-row gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {showSearch && (
              <div className="flex-1">
                <SearchBox
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={(query) => setSearchQuery(query)}
                  isLoading={isLoading}
                />
              </div>
            )}

            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400"
                  >
                    <option value="created">Created</option>
                    <option value="name">Name</option>
                    <option value="progress">Progress</option>
                    <option value="priority">Priority</option>
                    <option value="dueDate">Due Date</option>
                  </select>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <Icon name={sortOrder === 'asc' ? 'chevronUp' : 'chevronDown'} size="xs" />
                  </Button>
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Filter:</span>
                  {(
                    ['all', 'stuck', 'high-priority', 'in-progress', 'completed'] as FilterOption[]
                  ).map((filter) => {
                    const count = getFilterCount(filter);
                    const isActive = filterBy === filter;

                    return (
                      <Button
                        key={filter}
                        variant={isActive ? 'primary' : 'secondary'}
                        size="xs"
                        onClick={() => setFilterBy(filter)}
                        disabled={count === 0}
                        className="relative"
                      >
                        {filter === 'all'
                          ? 'All'
                          : filter === 'stuck'
                            ? 'Stuck'
                            : filter === 'high-priority'
                              ? 'High Priority'
                              : filter === 'in-progress'
                                ? 'In Progress'
                                : 'Completed'}
                        {count > 0 && (
                          <Badge
                            variant={isActive ? 'primary' : 'secondary'}
                            size="xs"
                            className="ml-2"
                          >
                            {count}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Task List */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TaskListSkeleton count={5} />
            </motion.div>
          ) : filteredAndSortedTasks.length > 0 ? (
            <motion.div
              key="tasks"
              className="grid gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredAndSortedTasks.map((task, index) => {
                const insight = insights.find((i) => i.isStuck) || {
                  isStuck: false,
                  daysInCurrentState: 0,
                  recommendedAction: null,
                  motivationTip: '',
                };

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <TaskCard task={task} insight={insight} onClick={() => onTaskClick?.(task)} />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {emptyState ? (
                <div className="text-center py-16">
                  <Icon
                    name={emptyState.icon}
                    size="xl"
                    variant="secondary"
                    className="mb-4 opacity-50"
                  />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">{emptyState.title}</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">{emptyState.description}</p>
                  {emptyState.action}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Icon name="task" size="xl" variant="secondary" className="mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No tasks found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || filterBy !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Create your first task to get started.'}
                  </p>
                  {onCreateTask && !searchQuery && filterBy === 'all' && (
                    <Button variant="primary" onClick={onCreateTask}>
                      <Icon name="add" size="sm" />
                      Create Task
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

// Task List Skeleton Component
const TaskListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <motion.div
        key={index}
        className="glass-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="h-6 bg-gray-700 rounded w-3/4"></div>
            <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
          </div>
          <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3 mb-4"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700 rounded w-20"></div>
            <div className="h-8 bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

export default TaskList;
