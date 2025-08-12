import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI } from '../../../services/api';

export default function AdminUsers() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'customer' | 'driver' | 'admin'>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // View/Edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; role: 'customer'|'driver'|'admin'; active: boolean; password: string }>({ name: '', email: '', phone: '', role: 'customer', active: true, password: '' });
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const resp = await usersAPI.list();
      if (resp.data && Array.isArray(resp.data)) {
        const mapped = (resp.data as any[]).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.active ? 'active' : 'inactive',
          joinedAt: u.createdAt || u.created_at,
          driverStats: u.driverStats,
        }));
        console.log('Mapped users with join dates:', mapped.map(u => ({ name: u.name, joinedAt: u.joinedAt })));
        setUsers(mapped);
      } else {
        setError(resp.error || 'Failed to load users');
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
      setError('Failed to load users. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filters = useMemo(() => ([
    { key: 'all', label: 'All Users', count: users.length },
    { key: 'customer', label: 'Customers', count: users.filter(u => u.role === 'customer').length },
    { key: 'driver', label: 'Drivers', count: users.filter(u => u.role === 'driver').length },
    { key: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length },
  ]), [users]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'customer': return '#0F766E';
      case 'driver': return '#7C3AED';
      case 'admin': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => status === 'active' ? '#16A34A' : '#6B7280';

  const formatJoinDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return '—';
    }
  };

  const handleUserAction = (action: string, user: any) => {
    if (action === 'View Profile') {
      openModal('view', user.id);
      return;
    }
    if (action === 'Edit') {
      openModal('edit', user.id);
      return;
    }
    if (action === 'Suspend' || action === 'Activate') {
      toggleActive(user);
      return;
    }
    Alert.alert(action, `${action} for ${user.name} coming soon.`);
  };

  const openModal = async (mode: 'view'|'edit', id: string) => {
    try {
      setModalMode(mode);
      setSelectedUserId(id);
      setRoleDropdownOpen(false);
      setModalVisible(true);
      setDetailsLoading(true);
      const resp = await usersAPI.getById(id);
      if (resp.data) {
        const u: any = resp.data;
        setForm({
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          role: (u.role || 'customer') as any,
          active: !!u.active,
          password: '',
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load user details');
      setModalVisible(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveUser = async () => {
    if (!selectedUserId) return;
    
    // Validate password if provided
    if (form.password.trim() && form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    try {
      setSaving(true);
      const payload: any = { 
        name: form.name, 
        email: form.email, 
        phone: form.phone, 
        role: form.role, 
        active: form.active 
      };
      
      // Include password if provided
      if (form.password.trim()) {
        payload.password = form.password;
      }
      
      const resp = await usersAPI.update(selectedUserId, payload);
      if (resp.data) {
        await fetchUsers(false);
        // Clear password field after successful update
        setForm(prev => ({ ...prev, password: '' }));
        const message = form.password.trim() 
          ? 'User updated successfully with new password' 
          : 'User updated successfully';
        Alert.alert('Success', message);
        setModalMode('view');
      } else {
        Alert.alert('Error', resp.error || 'Failed to update user');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: any) => {
    try {
      const newActiveStatus = !(user.status === 'active');
      const resp = await usersAPI.update(String(user.id), { active: newActiveStatus });
      if (resp.data) {
        await fetchUsers(false);
        // Update form state if modal is open for this user
        if (selectedUserId === user.id) {
          setForm(prev => ({ ...prev, active: newActiveStatus }));
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to change status');
    }
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;
    
    try {
      setSaving(true);
      const resp = await usersAPI.delete(selectedUserId);
      
      if (resp.data) {
        await fetchUsers(false);
        setModalVisible(false);
        Alert.alert('Success', `${form.name} has been deleted successfully`);
      } else {
        const errorMessage = resp.error || resp.errors?.[0] || 'Failed to delete user';
        Alert.alert('Error', errorMessage);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = () => {
    setIsCreating(true);
    setModalMode('edit');
    setSelectedUserId(null);
    setRoleDropdownOpen(false);
    setForm({ name: '', email: '', phone: '', role: 'customer', active: true, password: '' });
    setModalVisible(true);
  };

  const createUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    if (!form.password.trim()) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        role: form.role,
        active: form.active,
        password: form.password
      };
      
      const resp = await usersAPI.create(payload);
      if (resp.data) {
        await fetchUsers(false);
        setModalVisible(false);
        setIsCreating(false);
        Alert.alert('Success', `User ${form.name} has been created successfully.`);
      } else {
        Alert.alert('Error', resp.error || 'Failed to create user');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    if (selectedFilter !== 'all') list = list.filter(u => u.role === selectedFilter);
    if (activeFilter !== 'all') list = list.filter(u => (activeFilter === 'active' ? u.status === 'active' : u.status !== 'active'));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [users, selectedFilter, activeFilter, searchQuery]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Section - Primary */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.mainSearchContainer}>
              <Ionicons name="search-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.mainSearchInput}
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Status Toggle - Inline with search */}
            <TouchableOpacity 
              style={[styles.statusToggle, activeFilter === 'active' && styles.statusToggleActive]}
              onPress={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
            >
              <Ionicons 
                name={activeFilter === 'active' ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={18} 
                color={activeFilter === 'active' ? '#16A34A' : '#6B7280'} 
              />
              <Text style={[styles.statusToggleText, activeFilter === 'active' && styles.statusToggleTextActive]}>
                Active Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Role Filter Tabs - Secondary */}
        <View style={styles.roleFiltersSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleTabsContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
                style={[styles.roleTab, selectedFilter === filter.key && styles.activeRoleTab]}
                onPress={() => setSelectedFilter(filter.key as any)}
              >
                <Text style={[styles.roleTabText, selectedFilter === filter.key && styles.activeRoleTabText]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.loadingText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchUsers()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <ScrollView 
          style={styles.usersList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(false); }} />}
        >
          {filteredUsers.map((user) => (
            <TouchableOpacity 
              key={user.id} 
              style={styles.userCard}
              onPress={() => handleUserAction('View Profile', user)}
              activeOpacity={0.7}
            >
              {/* User Header */}
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user.role)}15` }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(user.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* User Info Row */}
              <View style={styles.userInfoRow}>
                <View style={styles.joinedInfo}>
                  <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.joinedText}>Joined {formatJoinDate(user.joinedAt)}</Text>
                </View>

                {/* Role-specific Stats & Chevron */}
                <View style={styles.rightSection}>
                  {user.role === 'driver' && user.driverStats && (
                    <View style={styles.driverStatsRow}>
                      {user.driverStats?.totalDeliveries != null && (
                        <View style={styles.driverStatItem}>
                          <Ionicons name="cube-outline" size={14} color="#0F766E" />
                          <Text style={styles.driverStatText}>{user.driverStats.totalDeliveries}</Text>
                        </View>
                      )}
                      {user.driverStats?.averageRating != null && (
                        <View style={styles.driverStatItem}>
                          <Ionicons name="star" size={14} color="#F59E0B" />
                          <Text style={styles.driverStatText}>{Number(user.driverStats.averageRating).toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.bottomSpacing} />
        </ScrollView>
        )}

        {/* User Details Modal */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>{isCreating ? 'Create New User' : 'User Details'}</Text>
                {!isCreating && <Text style={styles.modalSubtitle}>{form.name}</Text>}
              </View>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setIsCreating(false);
              }} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              </View>

            {detailsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0F766E" />
                <Text style={styles.loadingText}>Loading user details...</Text>
              </View>
            ) : (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* User Info Section */}
                  <View style={styles.section}>
                    <View style={styles.infoCard}>
                      {!isCreating && (
                        <View style={styles.userHeaderInfo}>
                          <View style={styles.userBasicInfo}>
                            <Text style={styles.userEmailLarge}>{form.email}</Text>
                          </View>
                          <View style={styles.userBadges}>
                            <View style={[styles.rolebadge, { backgroundColor: `${getRoleColor(form.role)}15` }]}>
                              <Text style={[styles.roleBadgeText, { color: getRoleColor(form.role) }]}>
                                {form.role.toUpperCase()}
                              </Text>
                            </View>
                            <View style={[styles.statusBadgeLarge, { backgroundColor: form.active ? '#DCFCE7' : '#FEF2F2' }]}>
                              <Ionicons 
                                name={form.active ? "checkmark-circle" : "close-circle"} 
                                size={14} 
                                color={form.active ? '#16A34A' : '#DC2626'} 
                              />
                              <Text style={[styles.statusBadgeTextLarge, { color: form.active ? '#16A34A' : '#DC2626' }]}>
                                {form.active ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </View>
                  </View>
                </View>
              )}

                      {(modalMode === 'edit' || isCreating) ? (
                        <>
                          <View style={styles.editField}>
                            <Text style={styles.editLabel}>Name</Text>
                            <TextInput 
                              style={styles.editInput} 
                              value={form.name} 
                              onChangeText={t => setForm({...form, name: t})}
                              placeholder="Enter name"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editLabel}>Email</Text>
                            <TextInput 
                              style={styles.editInput} 
                              value={form.email} 
                              onChangeText={t => setForm({...form, email: t})}
                              placeholder="Enter email"
                              autoCapitalize="none"
                              keyboardType="email-address"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editLabel}>Phone</Text>
                            <TextInput 
                              style={styles.editInput} 
                              value={form.phone} 
                              onChangeText={t => setForm({...form, phone: t})}
                              placeholder="Enter phone number"
                              keyboardType="phone-pad"
                            />
                          </View>
                          {(modalMode === 'edit' || isCreating) && (
                            <View style={styles.editField}>
                              <Text style={styles.editLabel}>
                                {isCreating ? 'Password' : 'New Password (optional)'}
                              </Text>
                              <TextInput 
                                style={styles.editInput} 
                                value={form.password} 
                                onChangeText={t => setForm({...form, password: t})}
                                placeholder={isCreating ? "Enter password" : "Leave blank to keep current password"}
                                secureTextEntry
                                autoCapitalize="none"
                              />
                            </View>
                          )}
                          <View style={styles.editField}>
                            <Text style={styles.editLabel}>Role</Text>
                            <TouchableOpacity 
                              style={styles.roleSelector} 
                              onPress={() => setRoleDropdownOpen(!roleDropdownOpen)}
                            >
                              <Text style={styles.roleSelectorText}>{form.role}</Text>
                              <Ionicons name={roleDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
                            </TouchableOpacity>
                            {roleDropdownOpen && (
                              <View style={styles.roleDropdown}>
                                {(['customer', 'driver', 'admin'] as const).map(role => (
                                  <TouchableOpacity 
                                    key={role} 
                                    style={styles.roleOption}
                                    onPress={() => { setForm({...form, role}); setRoleDropdownOpen(false); }}
                                  >
                                    <Text style={styles.roleOptionText}>{role}</Text>
                                    {form.role === role && <Ionicons name="checkmark" size={16} color="#0F766E" />}
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                          <View style={styles.editField}>
                            <View style={styles.statusToggleRow}>
                              <Text style={styles.editLabel}>Account Status</Text>
                              <Switch
                                value={form.active}
                                onValueChange={(v) => setForm({...form, active: v})}
                                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                                thumbColor={form.active ? '#0F766E' : '#9CA3AF'}
                              />
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.infoFields}>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phone</Text>
                            <Text style={styles.infoValue}>{form.phone || 'Not provided'}</Text>
                  </View>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Account Created</Text>
                            <Text style={styles.infoValue}>{selectedUserId ? formatJoinDate(users.find(u => u.id === selectedUserId)?.joinedAt) : '—'}</Text>
                  </View>
                </View>
              )}
                    </View>
                  </View>

                  {/* Admin Actions Section */}
                  {modalMode === 'view' && !isCreating && (
                    <View style={styles.section}>
                      <View style={styles.actionGrid}>
                <TouchableOpacity 
                          style={styles.actionCard}
                          onPress={() => setModalMode('edit')}
                >
                          <Ionicons name="create-outline" size={24} color="#7C3AED" />
                          <Text style={styles.actionCardTitle}>Edit User</Text>
                          <Text style={styles.actionCardDesc}>Modify user details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                          style={styles.actionCard}
                          onPress={() => toggleActive(users.find(u => u.id === selectedUserId)!)}
                        >
                          <Ionicons 
                            name={form.active ? "pause-circle-outline" : "play-circle-outline"} 
                            size={24} 
                            color={form.active ? "#EA580C" : "#16A34A"} 
                          />
                          <Text style={[styles.actionCardTitle, { color: form.active ? "#EA580C" : "#16A34A" }]}>
                            {form.active ? 'Suspend' : 'Activate'}
                          </Text>
                          <Text style={styles.actionCardDesc}>
                            {form.active ? 'Deactivate account' : 'Reactivate account'}
                          </Text>
                </TouchableOpacity>


                
                        <TouchableOpacity 
                          style={[styles.actionCard, styles.dangerAction]}
                          onPress={() => {
                            Alert.alert(
                              'Delete User',
                              `Are you sure you want to delete ${form.name}? This action cannot be undone.`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: deleteUser }
                              ]
                            );
                          }}
                        >
                          <Ionicons name="trash-outline" size={24} color="#DC2626" />
                          <Text style={[styles.actionCardTitle, { color: '#DC2626' }]}>Delete User</Text>
                          <Text style={styles.actionCardDesc}>Permanently remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Modal Actions */}
                {(modalMode === 'edit' || isCreating) && (
                  <View style={styles.modalActions}>
                  <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={() => {
                        if (isCreating) {
                          setModalVisible(false);
                          setIsCreating(false);
                        } else {
                          setModalMode('view');
                        }
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      style={[styles.saveButton, saving && { opacity: 0.6 }]} 
                      onPress={async () => {
                        if (isCreating) {
                          await createUser();
                        } else {
                          await saveUser();
                          setModalMode('view');
                        }
                      }}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name={isCreating ? "person-add" : "checkmark"} size={18} color="#fff" />
                          <Text style={styles.saveButtonText}>{isCreating ? 'Create User' : 'Save Changes'}</Text>
                        </>
                      )}
                  </TouchableOpacity>
                  </View>
                )}
              </KeyboardAvoidingView>
            )}
          </SafeAreaView>
        </Modal>



      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  mainSearchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    height: 48,
  },
  statusToggleActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  statusToggleText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusToggleTextActive: {
    color: '#16A34A',
  },
  roleFiltersSection: {
    backgroundColor: 'white',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  roleTabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  roleTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeRoleTab: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeRoleTabText: {
    color: 'white',
  },
  usersList: {
    // Removed flex: 1 - let ScrollView size naturally
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F766E',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 22,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  joinedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  driverStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  bottomSpacing: {
    height: 100,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  userHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  userBasicInfo: {
    flex: 1,
    marginRight: 16,
  },
  userNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmailLarge: {
    fontSize: 16,
    color: '#6B7280',
  },
  userBadges: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rolebadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeTextLarge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoFields: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  editField: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  roleSelectorText: {
    fontSize: 16,
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  roleDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  roleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#374151',
    textTransform: 'capitalize',
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dangerAction: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  actionCardDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 