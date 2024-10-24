import { useCallback, useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  Dimensions,
  ScaledSize,
  LayoutAnimation,
  Platform,
  UIManager,
  FlatList,
  View,
  Button,
  Modal,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance from "../../api/axiosInstance";
import { AxiosError } from "axios";
import React from "react";
import { Text } from "@rneui/base";
import { Colors } from "@/constants/Colors";

import DataRow from "@/components/DataRow";
import { DataType, RootStackParamList } from "@/constants/Types";
import HeaderArea from "@/components/HeaderArea";
import {
  CategoryDataContext,
  ExpenseDataContext,
  MethodDataContext,
  TagDataContext,
  TypeDataContext,
} from "@/constants/Context";
import { useFocusEffect } from "expo-router";
import PopupDialog from "react-native-popup-dialog";
import DeleteData from "@/components/DeleteData";
import EditData from "@/components/EditData";
import AsyncStorage from "@react-native-async-storage/async-storage"
import { NavigationProp, useNavigation } from "@react-navigation/native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DashboardScreenNavigationProp = NavigationProp<RootStackParamList, 'dashboard'>;

const Dashboard = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { data, setData } = useContext(ExpenseDataContext);
  const { tags, setTags } = useContext(TagDataContext);
  const { methods, setMethods } = useContext(MethodDataContext);
  const { types, setTypes } = useContext(TypeDataContext);
  const { category, setCategory } = useContext(CategoryDataContext);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingAmount, setDeletingAmount] = useState<number | null>(null);
  const [deletingTime, setDeletingTime] = useState<string | null>(null);
  const [deletingDesc, setDeletingDesc] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate("settings");
      }
    };
    checkAuth();
  }, []);


  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await axiosInstance.get("/expenses");
          setData(response.data);
        } catch (err: any) {
          console.error("Failed to fetch expenses: ", err);
          setError("Failed to fetch expenses");
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            await AsyncStorage.removeItem("token");
            navigation.navigate("settings");
          }
        } finally {
          setLoading(false);
        }
      };

      const fetchTags = async () => {
        try {
          const response = await axiosInstance.get("/tags");
          setTags(response.data);
        } catch (err: any) {
          console.error("Failed to fetch tags", err);
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            await AsyncStorage.removeItem("token");
            navigation.navigate("settings");
          }
        }
      };
      const fetchMethods = async () => {
        try {
          const response = await axiosInstance.get("/methods");
          setMethods(response.data);
        } catch (err: any) {
          console.error("Failed to fetch methods", err);
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            await AsyncStorage.removeItem("token");
            navigation.navigate("settings");
          }
        }
      };

      const fetchTypes = async () => {
        try {
          const response = await axiosInstance.get("/types");
          setTypes(response.data);
        } catch (err: any) {
          console.error("Failed to fetch types", err);
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            await AsyncStorage.removeItem("token");
            navigation.navigate("settings");
          }
        }
      };

      const fetchCategories = async () => {
        try {
          const response = await axiosInstance.get("/categories");
          setCategory(response.data);
        } catch (err: any) {
          console.error("Failed to fetch categories", err);
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            await AsyncStorage.removeItem("token");
            navigation.navigate("settings");
          }
        }
      };

      fetchMethods();
      fetchTypes();
      fetchCategories();

      fetchData();
      fetchTags();
    }, [])
  );


  const AssignMethod = (id: number): string => {
    const assignedMethod = methods?.find((m) => m.id === id);
    if (assignedMethod) {
      return assignedMethod.method_name;
    } else {
      return "Unknown Method";
    }
  };

  const AssignType = (id: number): string => {
    const assignedType = types?.find((t) => t.id === id);
    if (assignedType) {
      return assignedType.type_name;
    } else {
      return "Unknown Type";
    }
  };

  const AssignCategory = (id: number): string => {
    const assignedTag = tags?.find((t) => t.id === id);
    if (assignedTag) {
      const assignedCategory = category?.find(
        (c) => c.id === assignedTag.category_id
      );
      if (assignedCategory) {
        return assignedCategory.category_name;
      } else {
        return "Unknown Category";
      }
    } else {
      return "Unknown Tag for the Category";
    }
  };
  const AssignTag = (id: number): string => {
    const assignedTag = tags?.find((t) => t.id === id);
    if (assignedTag) {
      return assignedTag.tag_name;
    } else {
      return "Unknown Tag";
    }
  };

  const toggleExpand = useCallback((id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRow((prevExpandedRow) => (prevExpandedRow === id ? null : id));
  }, []);

  const keyExtractor = (exp: DataType) => exp.id.toString();

  const sortData = (data: DataType[]) => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      if (sortBy === "amount") {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      } else if (sortBy === "date") {
        const dateA = new Date(a.time).getTime();
        const dateB = new Date(b.time).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortBy === "description") {
        const descA = a.description || "";
        const descB = b.description || "";

        return sortOrder === "asc"
          ? descA.localeCompare(descB)
          : descB.localeCompare(descA);
      }
      return 0;
    });
  };

  const confirmDelete = (item: DataType) => {
    setDeletingId(item.id);
    setDeletingAmount(item.amount);
    setDeletingTime(new Date(item.time).toLocaleDateString());
    setDeletingDesc(item.description);
    setDeleting(true);
  };

  const handleDelete = () => {
    setDeleting(false);
  };

  const editingData = () => {
    setEditing(false);
  };
  const editData = (id: number) => {
    console.log("editing: ", id);
    setEditingId(id);
    setEditing(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!data || data.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No data available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderArea
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />
      <DeleteData
        deleting={deleting}
        setDeleting={setDeleting}
        deletingId={deletingId}
        deletingAmount={deletingAmount}
        deletingTime={deletingTime}
        deletingDesc={deletingDesc}
        handleDelete={handleDelete}
      />
      <EditData
        editing={editing}
        setEditing={setEditing}
        editingId={editingId}
        editingData={editingData}
      />
      <FlatList
        data={sortData(data)}
        keyExtractor={keyExtractor}
        style={{ padding: 0 }}
        renderItem={({ item }) => (
          <DataRow
            exp={item}
            isExpanded={expandedRow === item.id}
            toggleExpand={toggleExpand}
            AssignCategory={AssignCategory}
            AssignMethod={AssignMethod}
            AssignTag={AssignTag}
            AssignType={AssignType}
            deleting={deleting}
            confirmDelete={() => confirmDelete(item)}
            editing={editing}
            editData={editData}
          />
        )}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        contentContainerStyle={styles.scrollView}
      />
    </SafeAreaView>
  );
};

export default Dashboard;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 10,
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 5,
    paddingTop: 0,
  },
  view: {
    justifyContent: "center",
    alignItems: "center",
  },
});
